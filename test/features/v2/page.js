'use strict';

const { describe, it, before } = require( 'node:test' );
const assert = require( '../../utils/assert.js' );
const { initApp } = require( '../../../app.js' );
const { getConfig } = require( '../../../lib/util.js' );
const request = require( 'supertest' );

describe( 'v2 api - page gets', () => {
	let app;

	before( async () => {
		app = await initApp( getConfig() );
	} );

	// common URI prefix for the page
	const uri = '/v2/page/en/es/Pickling';

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
		assert.deepEqual( data.title, 'Pickling', 'Got the correct title' );
		// Must have revision id
		assert.ok( +data.revision >= 683049648 );
		// Must have segmented content
		assert.ok( +data.segmentedContent.length >= 100 );
		// Must have adapted categories
		assert.ok( +data.categories.length >= 1 );
	} );

	it( 'should throw a 404 for a non-existent page', async () => {
		const url = '/v2/page/en/es/Wikipedia_content_translation_system';
		const response = await request( app ).get( url );
		assert.deepEqual( response.statusCode, 404 );
	} );

} );
