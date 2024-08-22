'use strict';

const { describe, it } = require( 'node:test' );
const assert = require( '../utils/assert.js' );
const getConfig = require( '../../lib/util' ).getConfig;
const LingoCloud = require( '../../lib/mt' ).LingoCloud;

describe( 'LingoCloud machine translation', () => {
	it( 'Should fail because of wrong key ', () => {
		const cxConfig = getConfig();
		cxConfig.mt.LingoCloud.key = 'wrongkey';
		const lingoCloud = new LingoCloud( cxConfig );
		const testSourceContent = 'This is a random english text.';
		assert.fails( lingoCloud.translate( 'en', 'zh', testSourceContent ), ( err ) => {
			if ( err instanceof Error && /value/.test( err ) ) {
				return true;
			}
		} );
	} );
} );
