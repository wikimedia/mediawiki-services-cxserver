'use strict';

const preq = require( 'preq' );
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

	it( 'should get the whole page body', () => {
		return preq.get( {
			uri: uri
		} ).then( ( res ) => {
			// check the status
			assert.status( res, 200 );
			// check the returned Content-Type header
			assert.contentType( res, 'application/json; charset=utf-8' );
			// inspect the body
			assert.notDeepEqual( res.body, undefined, 'No body returned!' );
			// this should be the right page
			assert.deepEqual( res.body.title, 'Oxygen', 'Got the correct title' );
			// Must have revision id
			assert.ok( +res.body.revision >= 683049648 );
		} );
	} );

	it( 'should throw a 404 for a non-existent page', () => {
		return preq.get( {
			uri: server.config.uri + 'v1/page/Wikipedia_content_translation_system'
		} ).then( ( res ) => {
			// if we are here, no error was thrown, not good
			throw new Error( 'Expected an error to be thrown, got status: ', res.status );
		}, ( err ) => {
			// inspect the status
			assert.deepEqual( err.status, 404 );
		} );
	} );

} );
