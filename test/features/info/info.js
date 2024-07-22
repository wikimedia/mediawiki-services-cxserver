'use strict';

const { describe, it, before } = require( 'node:test' );
const assert = require( '../../utils/assert.js' );
const server = require( '../../utils/server.js' );
const { initApp } = require( '../../../app.js' );
const request = require( 'supertest' );

describe( 'service information', async () => {
	let app;

	before( async () => {
		app = await initApp( server.options );
	} );

	// common URI prefix for info tests
	const infoUri = '/_info/';

	// common function used for generating requests
	// and checking their return values
	async function checkRet( fieldName ) {
		const response = await request( app ).get( infoUri + fieldName );
		const data = await response.body;
		// check the returned Content-Type header
		assert.deepEqual( response.headers[ 'content-type' ], 'application/json; charset=utf-8' );

		// the status as well
		assert.deepEqual( response.statusCode, 200 );
		// finally, check the body has the specified field
		assert.notDeepEqual( data, undefined, 'No body returned!' );
		assert.notDeepEqual( data[ fieldName ], undefined, `No ${ fieldName } field returned!` );
	}

	it( 'should get the service name', () => checkRet( 'name' ) );

	it( 'should get the service version', () => checkRet( 'version' ) );

	it( 'should redirect to the service home page', async () => {
		const response = await request( app ).get( `${ infoUri }home`, { redirect: 'manual' } );
		assert.status( response, 301 );
	} );

	it( 'should get the service info', async () => {
		const response = await request( app ).get( infoUri );
		const data = await response.body;
		// check the status
		assert.deepEqual( response.statusCode, 200 );
		// check the returned Content-Type header
		assert.contentType( response, 'application/json; charset=utf-8' );
		// inspect the body
		assert.notDeepEqual( data, undefined, 'No body returned!' );
		assert.notDeepEqual( data.name, undefined, 'No name field returned!' );
		assert.notDeepEqual( data.version, undefined, 'No version field returned!' );
		assert.notDeepEqual( data.description, undefined, 'No description field returned!' );
		assert.notDeepEqual( data.home, undefined, 'No home field returned!' );
	} );

} );
