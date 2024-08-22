'use strict';

const { describe, it } = require( 'node:test' );
const assert = require( '../utils/assert' );
const getConfig = require( '../../lib/util' ).getConfig;
const Google = require( '../../lib/mt' ).Google;

describe( 'Google machine translation', () => {
	it( 'Should fail because of wrong key ', () => {
		const cxConfig = getConfig();
		cxConfig.mt.Google.key = 'wrongkey';
		const google = new Google( cxConfig );
		const testSourceContent = '<p>This is a <a href="/Test">test</a></p>';
		assert.fails(
			google.translate( 'en', 'ml', testSourceContent ),
			( err ) => {
				if ( ( err instanceof Error ) && /value/.test( err ) ) {
					return true;
				}
			}
		);
	} );
} );
