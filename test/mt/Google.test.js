'use strict';

const assert = require( '../utils/assert' );
const server = require( '../utils/server' );
const Google = require( '../../lib/mt' ).Google;

describe( 'Google machine translation', function () {
	it( 'Should fail because of wrong key ', () => {
		const cxConfig = server.config.service;
		cxConfig.conf.mt.Google.key = 'wrongkey';
		const google = new Google( cxConfig );
		const testSourceContent = '<p>This is a <a href="/Test">test</a></p>';
		assert.fails(
			google.translate( 'en', 'ml', testSourceContent ),
			function ( err ) {
				if ( ( err instanceof Error ) && /value/.test( err ) ) {
					return true;
				}
			}
		);
	} );
} );
