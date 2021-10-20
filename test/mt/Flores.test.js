'use strict';

const assert = require( '../utils/assert' );
const server = require( '../utils/server' );
const Flores = require( '../../lib/mt' ).Flores;

describe( 'Flores machine translation', function () {
	it( 'Should fail because of wrong key ', () => {
		const cxConfig = server.config.service;
		cxConfig.conf.mt.Flores.key = 'wrongkey';
		const flores = new Flores( cxConfig );
		const testSourceContent = '<p>This is a <a href="/Test">test</a></p>';
		assert.fails(
			flores.translate( 'en', 'ig', testSourceContent ),
			function ( err ) {
				if ( ( err instanceof Error ) && /value/.test( err ) ) {
					return true;
				}
			}
		);
	} );
} );
