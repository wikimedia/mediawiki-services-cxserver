'use strict';

const assert = require( '../../utils/assert.js' );
const server = require( '../../utils/server.js' );

if ( !server.stopHookAdded ) {
	server.stopHookAdded = true;
	after( () => server.stop() );
}

describe( 'v1 api - page gets', function () {
	this.timeout( 20000 );

	before( function () {
		return server.start();
	} );

	// common URI prefix for the page
	const uri = server.config.uri + 'v1/page/en/Oxygen';

	it( 'should get the whole page body', async () => {
		const response = await fetch( uri );
		const data = await response.json();
		// check the status
		assert.status( response, 200 );
		// check the returned Content-Type header
		assert.contentType( response, 'application/json; charset=utf-8' );
		// inspect the body
		assert.notDeepEqual( data, undefined, 'No body returned!' );
		// this should be the right page
		assert.deepEqual( data.title, 'Oxygen', 'Got the correct title' );
		// Must have revision id
		assert.ok( +data.revision >= 683049648 );

	} );

	it( 'should throw a 404 for a non-existent page', async () => {
		const url = server.config.uri + 'v1/page/Wikipedia_content_translation_system';
		const response = await fetch( url );
		assert.status( response, 404 );
	} );

} );
