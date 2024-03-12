'use strict';

const assert = require( '../../utils/assert.js' );
const server = require( '../../utils/server.js' );

if ( !server.stopHookAdded ) {
	server.stopHookAdded = true;
	after( () => server.stop() );
}

describe( 'service information', function () {

	this.timeout( 20000 );

	before( () => {
		return server.start();
	} );

	// common URI prefix for info tests
	const infoUri = `${ server.config.uri }_info/`;

	// common function used for generating requests
	// and checking their return values
	async function checkRet( fieldName ) {
		const response = await fetch( infoUri + fieldName );
		const data = await response.json();
		// check the returned Content-Type header
		assert.contentType( response, 'application/json; charset=utf-8' );
		// the status as well
		assert.status( response, 200 );
		// finally, check the body has the specified field
		assert.notDeepEqual( data, undefined, 'No body returned!' );
		assert.notDeepEqual( data[ fieldName ], undefined, `No ${ fieldName } field returned!` );
	}

	it( 'should get the service name', () => {
		return checkRet( 'name' );
	} );

	it( 'should get the service version', () => {
		return checkRet( 'version' );
	} );

	it( 'should redirect to the service home page', async () => {
		const response = await fetch( `${ infoUri }home`, { redirect: 'manual' } );
		assert.status( response, 301 );
	} );

	it( 'should get the service info', async () => {
		const response = await fetch( infoUri );
		const data = await response.json();
		// check the status
		assert.status( response, 200 );
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
