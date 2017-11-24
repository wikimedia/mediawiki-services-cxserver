'use strict';

const assert = require( '../utils/assert.js' );
const server = require( '../utils/server.js' );
const Youdao = require( '../../lib/mt' ).Youdao;

describe( 'Youdao machine translation', function () {
	it( 'Should fail because of wrong key ', () => {
		const cxConfig = server.config.service;
		cxConfig.conf.mt.Youdao.key = 'wrongkey';
		const youdao = new Youdao( cxConfig );
		const testSourceContent = '<p>This is a <a href="/Test">test</a></p>';
		assert.fails(
			youdao.translate( 'en', 'zh', testSourceContent ),
			function ( err ) {
				if ( ( err instanceof Error ) && /value/.test( err ) ) {
					return true;
				}
			}
		);
	} );
} );
