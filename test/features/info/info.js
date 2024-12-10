import { before, describe, it } from 'node:test';
import request from 'supertest';
import { contentType, deepEqual, notDeepEqual, status } from '../../utils/assert.js';
import { getConfig } from '../../../lib/util.js';
import { initApp } from '../../../app.js';

describe( 'service information', async () => {
	let app;

	before( async () => {
		app = await initApp( getConfig() );
	} );

	// common URI prefix for info tests
	const infoUri = '/_info/';

	// common function used for generating requests
	// and checking their return values
	async function checkRet( fieldName ) {
		const response = await request( app ).get( infoUri + fieldName );
		const data = await response.body;
		// check the returned Content-Type header
		deepEqual( response.headers[ 'content-type' ], 'application/json; charset=utf-8' );

		// the status as well
		deepEqual( response.statusCode, 200 );
		// finally, check the body has the specified field
		notDeepEqual( data, undefined, 'No body returned!' );
		notDeepEqual( data[ fieldName ], undefined, `No ${ fieldName } field returned!` );
	}

	it( 'should get the service name', () => checkRet( 'name' ) );

	it( 'should get the service version', () => checkRet( 'version' ) );

	it( 'should redirect to the service home page', async () => {
		const response = await request( app ).get( `${ infoUri }home`, { redirect: 'manual' } );
		status( response, 301 );
	} );

	it( 'should get the service info', async () => {
		const response = await request( app ).get( infoUri );
		const data = await response.body;
		// check the status
		deepEqual( response.statusCode, 200 );
		// check the returned Content-Type header
		contentType( response, 'application/json; charset=utf-8' );
		// inspect the body
		notDeepEqual( data, undefined, 'No body returned!' );
		notDeepEqual( data.name, undefined, 'No name field returned!' );
		notDeepEqual( data.version, undefined, 'No version field returned!' );
		notDeepEqual( data.description, undefined, 'No description field returned!' );
		notDeepEqual( data.home, undefined, 'No home field returned!' );
	} );

} );
