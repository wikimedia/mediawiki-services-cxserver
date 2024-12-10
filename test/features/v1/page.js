import { before, describe, it } from 'node:test';
import assert from 'node:assert/strict';
import request from 'supertest';
import { contentType, deepEqual, notDeepEqual } from '../../utils/assert.js';
import { getConfig } from '../../../lib/util.js';
import { initApp } from '../../../app.js';

describe( 'v1 api - page gets', async () => {
	let app;

	before( async () => {
		app = await initApp( getConfig() );
	} );

	// common URI prefix for the page
	const uri = '/v1/page/en/Oxygen';

	it( 'should get the whole page body', async () => {
		const response = await request( app ).get( uri );

		const data = await response.body;
		// check the status
		deepEqual( response.statusCode, 200 );
		// check the returned Content-Type header
		contentType( response, 'application/json; charset=utf-8' );
		// inspect the body
		notDeepEqual( data, undefined, 'No body returned!' );
		// this should be the right page
		deepEqual( data.title, 'Oxygen', 'Got the correct title' );
		// Must have revision id
		assert.ok( +data.revision >= 683049648 );

	} );

	it( 'should throw a 404 for a non-existent page', async () => {
		const url = '/v1/page/Wikipedia_content_translation_system';
		const response = await request( app ).get( url );
		deepEqual( response.statusCode, 404 );
	} );

} );
