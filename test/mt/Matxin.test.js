'use strict';

const assert = require( '../utils/assert.js' );
const server = require( '../utils/server.js' );
const Matxin = require( '../../lib/mt' ).Matxin;

describe( 'Matxin machine translation', function () {
	it( 'Should fail because of wrong key ', () => {
		const cxConfig = server.config.service;
		cxConfig.conf.mt.Matxin.key = 'wrongkey';
		const matxin = new Matxin( cxConfig );
		const testSourceContent = '<p>Esta es una <a href="/prueba">prueba</a></p>';
		assert.fails(
			matxin.translate( 'es', 'eu', testSourceContent ),
			function ( err ) {
				if ( ( err instanceof Error ) && /value/.test( err ) ) {
					return true;
				}
			}
		);
	} );
} );
