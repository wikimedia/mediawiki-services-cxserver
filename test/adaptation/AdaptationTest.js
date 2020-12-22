'use strict';

const Adapter = require( '../../lib/Adapter' );
const MWApiRequestManager = require( '../../lib/mw/MWApiRequestManager' );
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

	before( function () {
		mocker.setup( mocks );
	} );

	after( function () {
		mocker.dump( __dirname + '/AdaptationTests.mocks.json' );
	} );

	async.each( tests, ( test, done ) => {
		it( test.desc, function () {
			const cxserver = server.config.conf.services[ server.config.conf.services.length - 1 ];
			cxserver.conf.mtClient = new TestClient( cxserver );
			const adapter = new Adapter( test.from, test.to, api, cxserver );

			return adapter.adapt( test.source ).then( ( result ) => {
				const actualDom = new jsdom.JSDOM( result.getHtml() );

				for ( const id in test.resultAttributes ) {
					assert.ok( actualDom.window.document.getElementById( id ), `Element with id ${id} exists in the result` );
					for ( const attribute in test.resultAttributes[ id ] ) {
						const actualAttributeValue = actualDom.window.document
							.getElementById( id ).getAttribute( attribute );
						const expectedAttributeValue = test.resultAttributes[ id ][ attribute ];
						if ( typeof expectedAttributeValue === 'object' ) {
							assert.deepEqual(
								JSON.parse( actualAttributeValue ),
								expectedAttributeValue,
								`Comparing attribute ${attribute} for element ${id}`
							);
						} else {
							assert.deepEqual(
								actualAttributeValue,
								expectedAttributeValue,
								`Comparing attribute ${attribute} for element ${id}`
							);
						}
					}
				}
				done( null );
			} );
		} );
	} );
} );
