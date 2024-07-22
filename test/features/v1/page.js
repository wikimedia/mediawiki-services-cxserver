'use strict';

const { describe, it, before } = require( 'node:test' );
const assert = require( '../../utils/assert.js' );
const server = require( '../../utils/server.js' );
const { initApp } = require( '../../../app.js' );
const request = require( 'supertest' );

describe( 'v1 api - page gets', async () => {
	let app;

	before( async () => {
		app = await initApp( server.options );
	} );

	// common URI prefix for the page
	const uri = '/v1/page/en/Oxygen';

	it( 'should get the whole page body', async () => {
		const response = await request( app ).get( uri );

		const data = await response.body;
		// check the status
		assert.deepEqual( response.statusCode, 200 );
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
		const url = '/v1/page/Wikipedia_content_translation_system';
		const response = await request( app ).get( url );
		assert.deepEqual( response.statusCode, 404 );
	} );

} );
