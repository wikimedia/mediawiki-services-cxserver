'use strict';
const { describe, it, before } = require( 'node:test' );
const assert = require( '../../utils/assert.js' );
const server = require( '../../utils/server.js' );
const { initApp } = require( '../../../app.js' );
const request = require( 'supertest' );

describe( 'express app', async () => {
	let app;

	before( async () => {
		app = await initApp( server.options );
	} );

	it( 'should get robots.txt', async () => {
		const response = await request( app ).get( '/robots.txt' );
		assert.deepEqual( response.text, 'User-agent: *\nDisallow: /' );
		assert.deepEqual( response.statusCode, 200 );
	} );

	it( 'should set CORS headers', async () => {
		if ( server.config.cors === false ) {
			return true;
		}
		const response = await request( app ).get( '/robots.txt' );
		assert.deepEqual( response.headers[ 'access-control-allow-origin' ], '*' );
		assert.deepEqual( !!( response.headers[ 'access-control-allow-headers' ] ), true );
		assert.deepEqual( !!( response.headers[ 'access-control-expose-headers' ] ), true );
		assert.deepEqual( response.statusCode, 200 );

	} );

	it( 'should set CSP headers', async () => {
		if ( server.config.csp === false ) {
			return true;
		}

		const response = await request( app ).get( '/robots.txt' );
		assert.deepEqual( response.headers[ 'x-xss-protection' ], '1; mode=block' );
		assert.deepEqual( response.headers[ 'x-content-type-options' ], 'nosniff' );
		assert.deepEqual( response.headers[ 'x-frame-options' ], 'SAMEORIGIN' );
		assert.deepEqual( response.headers[ 'content-security-policy' ], 'default-src' );
		assert.deepEqual( response.headers[ 'x-content-security-policy' ], 'default-src' );
		assert.deepEqual( response.headers[ 'x-webkit-csp' ], 'default-src' );

	} );

} );
