'use strict';

const { describe, it } = require( 'node:test' );
const assert = require( '../utils/assert.js' );
const getConfig = require( '../../lib/util' ).getConfig;
const Elia = require( '../../lib/mt' ).Elia;

describe( 'Elia machine translation', () => {
	it( 'Should fail because of wrong key ', () => {
		const cxConfig = getConfig();
		cxConfig.mt.Elia.key = 'wrongkey';
		const elia = new Elia( cxConfig );
		const testSourceContent = '<p>Esta es una <a href="/prueba">prueba</a></p>';
		assert.fails(
			elia.translate( 'es', 'eu', testSourceContent ),
			( err ) => {
				if ( ( err instanceof Error ) && /value/.test( err ) ) {
					return true;
				}
			}
		);
	} );
} );
