'use strict';

const assert = require( 'assert' ),
	server = require( '../utils/server.js' ),
	async = require( 'async' ),
	Apertium = require( '../../lib/mt' ).Apertium,
	Adapter = require( '../../lib/Adapter' ),
	tests = require( './AdaptationTests.json' ),
	jsdom = require( 'jsdom' );

describe( 'Adaptation tests', () => {
	async.forEach( tests, ( test ) => {
		let adapter, cxserver;

		cxserver = server.config.conf.services[ server.config.conf.services.length - 1 ];
		cxserver.conf.mtClient = new Apertium( cxserver );
		adapter = new Adapter( test.from, test.to, cxserver );
		it( test.desc, () => {
			let expectedDom = new jsdom.JSDOM( test.result );
			// Put data-cx in
			if ( test[ 'data-cx' ] ) {
				for ( let id in test[ 'data-cx' ] ) {
					expectedDom.window.document.getElementById( id )
						.setAttribute( 'data-cx', JSON.stringify( test[ 'data-cx' ][ id ] ) );
				}
			}

			return adapter.adapt( test.source ).then( ( result ) => {
				let actualDom = new jsdom.JSDOM( result.getHtml() );
				if ( actualDom.window.document.body.isEqualNode( expectedDom.window.document.body ) ) {
					assert.ok( true, test.desc );
				} else {
					assert.equal(
						actualDom.window.document.body.outerHTML,
						expectedDom.window.document.body.outerHTML,
						test.desc
					);
				}
			} );
		} );
	} );
} );
