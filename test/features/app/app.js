import { before, describe, it } from 'node:test';
import request from 'supertest';
import { deepEqual } from '../../utils/assert.js';
import { getConfig } from '../../../lib/util.js';
import { initApp } from '../../../app.js';

describe( 'express app', async () => {
	let app;

	before( async () => {
		app = await initApp( getConfig() );
	} );

	it( 'should get robots.txt', async () => {
		const response = await request( app ).get( '/robots.txt' );
		deepEqual( response.text, 'User-agent: *\nDisallow: /' );
		deepEqual( response.statusCode, 200 );
	} );

	it( 'should set CORS headers', async () => {
		if ( getConfig().cors === false ) {
			return true;
		}
		const response = await request( app ).get( '/robots.txt' );
		deepEqual( response.headers[ 'access-control-allow-origin' ], '*' );
		deepEqual( !!( response.headers[ 'access-control-allow-headers' ] ), true );
		deepEqual( !!( response.headers[ 'access-control-expose-headers' ] ), true );
		deepEqual( response.statusCode, 200 );

	} );

	it( 'should set CSP headers', async () => {
		if ( getConfig().csp === false ) {
			return true;
		}

		const response = await request( app ).get( '/robots.txt' );
		deepEqual( response.headers[ 'x-xss-protection' ], '1; mode=block' );
		deepEqual( response.headers[ 'x-content-type-options' ], 'nosniff' );
		deepEqual( response.headers[ 'x-frame-options' ], 'SAMEORIGIN' );
		deepEqual( response.headers[ 'content-security-policy' ], 'default-src' );
		deepEqual( response.headers[ 'x-content-security-policy' ], 'default-src' );
		deepEqual( response.headers[ 'x-webkit-csp' ], 'default-src' );

	} );

} );
