'use strict';

var preq = require( 'preq' ),
	assert = require( '../../utils/assert.js' ),
	server = require( '../../utils/server.js' );

describe( 'page gets', function () {
	var uri;
	this.timeout( 20000 );

	before( function () {
		return server.start();
	} );

	// common URI prefix for the page
	uri = server.config.uri + 'v1/page/en/Oxygen';

	it( 'should get the whole page body', function () {
		return preq.get( {
			uri: uri
		} ).then( function ( res ) {
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

	it( 'should throw a 404 for a non-existent page', function () {
		return preq.get( {
			uri: server.config.uri + 'v1/page/Wikipedia_content_translation_system'
		} ).then( function ( res ) {
			// if we are here, no error was thrown, not good
			throw new Error( 'Expected an error to be thrown, got status: ', res.status );
		}, function ( err ) {
			// inspect the status
			assert.deepEqual( err.status, 404 );
		} );
	} );

} );
