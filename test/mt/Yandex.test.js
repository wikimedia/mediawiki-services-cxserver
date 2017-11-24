'use strict';

const assert = require( '../utils/assert.js' );
const server = require( '../utils/server.js' );
const Yandex = require( '../../lib/mt' ).Yandex;

describe( 'Yandex machine translation', function () {
	it( 'Should fail because of wrong key ', () => {
		const cxConfig = server.config.service;
		cxConfig.conf.mt.Yandex.key = 'wrongkey';
		const yandex = new Yandex( cxConfig );
		const testSourceContent = '<p>This is a <a href="/Test">test</a></p>';
		assert.fails(
			yandex.translate( 'en', 'gu', testSourceContent ),
			function ( err ) {
				if ( ( err instanceof Error ) && /value/.test( err ) ) {
					return true;
				}
			}
		);
	} );
} );
