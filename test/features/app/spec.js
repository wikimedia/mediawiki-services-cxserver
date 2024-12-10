import { before, describe, it } from 'node:test';
import { readFileSync } from 'fs';
import swaggerrouter from 'swagger-router';
import { load } from 'js-yaml';
import request from 'supertest';
import OpenAPISchemaValidator from 'openapi-schema-validator';
import { status as assertStatus, contentType, deepEqual, notDeepEqual } from '../../utils/assert.js';
import { getConfig } from '../../../lib/util.js';
import { initApp } from '../../../app.js';

const ValidatorClass = OpenAPISchemaValidator.default;
const validator = new ValidatorClass( { version: 3 } );
const dirname = new URL( '.', import.meta.url ).pathname;
function staticSpecLoad() {

	let spec;
	const myService = getConfig();
	const specPath = `${ dirname }/../../../${ myService.spec ? myService.spec : 'spec.yaml' }`;

	try {
		spec = load( readFileSync( specPath ) );
	} catch ( e ) {
		throw new Error( `Cannot load spec file: ${ specPath }` );
	}

	return spec;

}

function validateExamples( pathStr, defParams, mSpec ) {

	const uri = new swaggerrouter.URI( pathStr, {}, true );

	if ( !mSpec ) {
		try {
			uri.expand( defParams );
			return true;
		} catch ( e ) {
			throw new Error( `Missing parameter for route ${ pathStr } : ${ e.message }` );
		}
	}

	if ( !Array.isArray( mSpec ) ) {
		throw new Error( `Route ${ pathStr } : x-amples must be an array!` );
	}

	mSpec.forEach( ( ex, idx ) => {
		if ( !ex.title ) {
			throw new Error( `Route ${ pathStr }, example ${ idx }: title missing!` );
		}
		ex.request = ex.request || {};
		try {
			uri.expand( Object.assign( {}, defParams, ex.request.params || {} ) );
		} catch ( e ) {
			throw new Error(
				`Route ${ pathStr }, example ${ idx } (${ ex.title }): missing parameter: ${ e.message }`
			);
		}
	} );

	return true;

}

function constructTestCase( title, path, method, req, response ) {

	return {
		title,
		request: {
			uri: '/' + ( path[ 0 ] === '/' ? path.slice( 1 ) : path ),
			method,
			headers: req.headers || { 'Content-Type': 'application/json' },
			query: req.query,
			body: req.body,
			followRedirect: false
		},
		response: {
			status: response.status || 200,
			headers: response.headers || {},
			body: response.body
		}
	};

}

function constructTests( paths, defParams ) {

	const ret = [];

	Object.keys( paths ).forEach( ( pathStr ) => {
		Object.keys( paths[ pathStr ] ).forEach( ( method ) => {
			const p = paths[ pathStr ][ method ];
			if ( {}.hasOwnProperty.call( p, 'x-monitor' ) && !p[ 'x-monitor' ] ) {
				return;
			}
			const uri = new swaggerrouter.URI( pathStr, {}, true );
			if ( !p[ 'x-amples' ] ) {
				ret.push( constructTestCase(
					pathStr,
					uri.toString( { params: defParams } ),
					method,
					{},
					{}
				) );
				return;
			}
			p[ 'x-amples' ].forEach( ( ex ) => {
				ex.request = ex.request || {};
				ret.push( constructTestCase(
					ex.title,
					uri.toString( {
						params: Object.assign( {}, defParams, ex.request.params || {} )
					} ),
					method,
					ex.request,
					ex.response || {}
				) );
			} );
		} );
	} );

	return ret;

}

function cmp( result, expected, errMsg ) {

	if ( expected === null || expected === undefined ) {
		// nothing to expect, so we can return
		return true;
	}
	if ( result === null || result === undefined ) {
		result = '';
	}

	if ( expected.constructor === Object ) {
		Object.keys( expected ).forEach( ( key ) => {
			const val = expected[ key ];
			deepEqual( {}.hasOwnProperty.call( result, key ), true,
				`Body field ${ key } not found in response!` );
			cmp( result[ key ], val, `${ key } body field mismatch!` );
		} );
		return true;
	} else if ( expected.constructor === Array ) {
		if ( result.constructor !== Array ) {
			deepEqual( result, expected, errMsg );
			return true;
		}
		// only one item in expected - compare them all
		if ( expected.length === 1 && result.length > 1 ) {
			result.forEach( ( item ) => {
				cmp( item, expected[ 0 ], errMsg );
			} );
			return true;
		}
		// more than one item expected, check them one by one
		if ( expected.length !== result.length ) {
			deepEqual( result, expected, errMsg );
			return true;
		}
		expected.forEach( ( item, idx ) => {
			cmp( result[ idx ], item, errMsg );
		} );
		return true;
	}

	if ( expected.length > 1 && expected[ 0 ] === '/' && expected[ expected.length - 1 ] === '/' ) {
		if ( ( new RegExp( expected.slice( 1, -1 ) ) ).test( result ) ) {
			return true;
		}
	} else if ( expected.length === 0 && result.length === 0 ) {
		return true;
	} else if ( result === expected || result.startsWith( expected ) ) {
		return true;
	}

	deepEqual( result, expected, errMsg );
	return true;

}

async function validateTestResponse( testCase, response ) {

	const expRes = testCase.response;
	if ( response.statusCode === 500 ) {
		console.error( response );
	}
	// check the status
	deepEqual( response.statusCode, expRes.status, 'Status mismatch!' );

	// check the headers
	Object.keys( expRes.headers ).forEach( ( key ) => {
		const val = expRes.headers[ key ];
		deepEqual( !!response.headers[ key ], true,
			`Header ${ key } not found in response!` );
		cmp( response.headers[ key ], val, `${ key } header mismatch!` );
	} );

	// check the body
	if ( !expRes.body ) {
		return true;
	}
	let body = await response.body || '';
	if ( Buffer.isBuffer( body ) ) {
		body = body.toString();
	}
	if ( expRes.body.constructor !== body.constructor ) {
		if ( expRes.body.constructor === String ) {
			body = JSON.stringify( body );
		} else {
			body = JSON.parse( body );
		}
	}
	// check that the body type is the same
	if ( expRes.body.constructor !== body.constructor ) {
		throw new Error(
			`Expected body type ${ expRes.body.constructor } but got ${ body.constructor }`
		);
	}

	// compare the bodies
	cmp( body, expRes.body, 'Body mismatch!' );

	return true;

}

describe( 'Swagger spec', async () => {
	let app;

	before( async () => {
		app = await initApp( getConfig() );
	} );

	// the variable holding the spec
	let spec = staticSpecLoad();
	// default params, if given
	let defParams = spec[ 'x-default-params' ] || {};

	it( 'get the spec', async () => {
		const response = await request( app ).get( '?spec' );

		const data = await response.body;
		assertStatus( response, 200 );
		contentType( response, 'application/json; charset=utf-8' );
		notDeepEqual( data, undefined, 'No body received!' );
		spec = data;
	} );

	it( 'should expose valid OpenAPI spec', async () => {
		const response = await request( app ).get( '?spec' );
		const data = await response.body;
		deepEqual( { errors: [] }, validator.validate( data ), 'Spec must have no validation errors' );

	} );

	it( 'spec validation', () => {
		if ( spec[ 'x-default-params' ] ) {
			defParams = spec[ 'x-default-params' ];
		}
		// check the high-level attributes
		[ 'info', 'openapi', 'paths' ].forEach( ( prop ) => {
			deepEqual( !!spec[ prop ], true, `No ${ prop } field present!` );
		} );
		// no paths - no love
		deepEqual( !!Object.keys( spec.paths ), true, 'No paths given in the spec!' );
		// now check each path
		Object.keys( spec.paths ).forEach( ( pathStr ) => {
			deepEqual( !!pathStr, true, 'A path cannot have a length of zero!' );
			const path = spec.paths[ pathStr ];
			deepEqual( !!Object.keys( path ), true, `No methods defined for path: ${ pathStr }` );
			Object.keys( path ).forEach( ( method ) => {
				const mSpec = path[ method ];
				if ( {}.hasOwnProperty.call( mSpec, 'x-monitor' ) && !mSpec[ 'x-monitor' ] ) {
					return;
				}
				validateExamples( pathStr, defParams, mSpec[ 'x-amples' ] );
			} );
		} );
	} );

	describe( 'routes', async () => {
		constructTests( spec.paths, defParams ).forEach( ( testCase ) => {
			it( testCase.title, async () => {
				let uri = testCase.request.uri;
				let response;
				const options = {
					method: testCase.request.method.toUpperCase(),
					headers: testCase.request.headers,
					redirect: 'manual'
				};
				if ( options.method === 'POST' && testCase.request.body ) {
					options.body = JSON.stringify( testCase.request.body );

					response = await request( app ).post( uri ).send( options.body ).set( 'Content-Type', 'application/json' )
						.set( 'Accept', 'application/json' );
				} else {
					uri = `${ uri }?${ new URLSearchParams( testCase.request.query ).toString() }`;
					response = await request( app ).get( uri, options );
				}

				const result = await validateTestResponse( testCase, response );

				return result;
			} );
		} );

	} );
} );
