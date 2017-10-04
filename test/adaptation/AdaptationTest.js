'use strict';

const assert = require( 'assert' ),
	server = require( '../utils/server.js' ),
	async = require( 'async' ),
	TestClient = require( '../../lib/mt' ).TestClient,
	Adapter = require( '../../lib/Adapter' ),
	tests = require( './AdaptationTests.json' ),
	jsdom = require( 'jsdom' );

describe( 'Adaptation tests', () => {
	async.forEach( tests, ( test ) => {
		const cxserver = server.config.conf.services[ server.config.conf.services.length - 1 ];
		cxserver.conf.mtClient = new TestClient( cxserver );
		const adapter = new Adapter( test.from, test.to, cxserver );
		it( test.desc, () => {
			return adapter.adapt( test.source ).then( ( result ) => {
				const actualDom = new jsdom.JSDOM( result.getHtml() );
				for ( let id in test.resultAttributes ) {
					assert.ok( actualDom.window.document.getElementById( id ), `Element with id ${id} exists in the result` );
					for ( let attribute in test.resultAttributes[ id ] ) {
						const actualAttributeValue = actualDom.window.document.getElementById( id )
							.getAttribute( attribute );
						const expectedAttributeValue = test.resultAttributes[ id ][ attribute ];
						if ( typeof expectedAttributeValue === 'object' ) {
							assert.deepEqual( JSON.parse( actualAttributeValue ), expectedAttributeValue );
						} else {
							assert.deepEqual( actualAttributeValue, expectedAttributeValue );
						}
					}
				}
			} );
		} );
	} );
} );
