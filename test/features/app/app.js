'use strict';

const assert = require( '../../utils/assert.js' );
const server = require( '../../utils/server.js' );

if ( !server.stopHookAdded ) {
	server.stopHookAdded = true;
	after( () => server.stop() );
}

describe( 'express app', function () {

	before( async () => await server.start() );

	it( 'should get robots.txt', async () => {
		const response = await fetch( `${ server.config.uri }robots.txt` );
		// check the status
		assert.status( response, 200 );
	} );

	it( 'should set CORS headers', async () => {
		if ( server.config.service.conf.cors === false ) {
			return true;
		}
		const response = await fetch( `${ server.config.uri }robots.txt` );
		assert.deepEqual( response.headers.get( 'access-control-allow-origin' ), '*' );
		assert.deepEqual( !!response.headers.get( 'access-control-allow-headers' ), true );
		assert.deepEqual( !!response.headers.get( 'access-control-expose-headers' ), true );

	} );

	it( 'should set CSP headers', async () => {
		if ( server.config.service.conf.csp === false ) {
			return true;
		}

		const response = await fetch( `${ server.config.uri }robots.txt` );

		assert.deepEqual( response.headers.get( 'x-xss-protection' ), '1; mode=block' );
		assert.deepEqual( response.headers.get( 'x-content-type-options' ), 'nosniff' );
		assert.deepEqual( response.headers.get( 'x-frame-options' ), 'SAMEORIGIN' );
		assert.deepEqual( response.headers.get( 'content-security-policy' ), 'default-src' );
		assert.deepEqual( response.headers.get( 'x-content-security-policy' ), 'default-src' );
		assert.deepEqual( response.headers.get( 'x-webkit-csp' ), 'default-src' );
	} );

} );
