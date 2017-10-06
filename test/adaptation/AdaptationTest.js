'use strict';

const Adapter = require( '../../lib/Adapter' );
const MWApiRequestManager = require( '../../lib/mw/ApiRequestManager' );
const TestClient = require( '../../lib/mt' ).TestClient;
const TestUtils = require( '../testutils' );
const assert = require( 'assert' );
const async = require( 'async' );
const jsdom = require( 'jsdom' );
const server = require( '../utils/server' );

const mocks = require( './AdaptationTests.mocks.json' );
const tests = require( './AdaptationTests.json' );

describe( 'Adaptation tests', () => {
	const api = new MWApiRequestManager( server.config );
	const mocker = new TestUtils( api );
	mocker.setup( mocks );

	async.each( tests, ( test, done ) => {
		const cxserver = server.config.conf.services[ server.config.conf.services.length - 1 ];
		cxserver.conf.mtClient = new TestClient( cxserver );
		const adapter = new Adapter( test.from, test.to, api, cxserver );
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
				done( null );
			} );
		} );
	}, mocker.dump.bind( mocker, 'test/adaptation/AdaptationTests.mocks.json' ) );
} );
