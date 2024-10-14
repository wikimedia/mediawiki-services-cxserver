'use strict';

const { describe, it, after, before } = require( 'node:test' );
const Adapter = require( '../../lib/Adapter' );
const MWApiRequestManager = require( '../../lib/mw/MWApiRequestManager' );
const TestClient = require( '../../lib/mt' ).TestClient;
const TestUtils = require( '../testutils' );
const assert = require( 'node:assert/strict' );
const async = require( 'async' );
const jsdom = require( 'jsdom' );
const { getConfig } = require( '../../lib/util.js' );
const mocks = require( './AdaptationTests.mocks.json' );
const tests = require( './AdaptationTests.json' );
const { initApp } = require( '../../app.js' );

describe( 'Adaptation tests', () => {
	const api = new MWApiRequestManager( getConfig() );
	const mocker = new TestUtils( api );
	let app;

	before( async () => {
		mocker.setup( mocks );
		app = await initApp( getConfig() );
	} );

	after( () => {
		mocker.dump( __dirname + '/AdaptationTests.mocks.json' );
	} );

	async.each( tests, ( testcase, done ) => {
		it( testcase.desc, () => {

			app.mtClient = new TestClient( app );
			const adapter = new Adapter( testcase.from, testcase.to, api, app );

			return adapter.adapt( testcase.source ).then( ( result ) => {
				const actualDom = new jsdom.JSDOM( result.getHtml() );

				for ( const id in testcase.resultAttributes ) {
					assert.ok( actualDom.window.document.getElementById( id ), `Element with id ${ id } exists in the result` );
					for ( const attribute in testcase.resultAttributes[ id ] ) {
						const actualAttributeValue = actualDom.window.document
							.getElementById( id ).getAttribute( attribute );
						const expectedAttributeValue = testcase.resultAttributes[ id ][ attribute ];
						if ( attribute === 'text' ) {
							const actualText = actualDom.window.document
								.getElementById( id ).textContent;
							assert.equal(
								actualText,
								testcase.resultAttributes[ id ][ attribute ],
								`Comparing text value for element ${ id }`
							);
						} else if ( typeof expectedAttributeValue === 'object' ) {
							assert.deepEqual(
								JSON.parse( actualAttributeValue ),
								expectedAttributeValue,
								`Comparing attribute ${ attribute } for element ${ id }`
							);
						} else {
							assert.deepEqual(
								actualAttributeValue,
								expectedAttributeValue,
								`Comparing attribute ${ attribute } for element ${ id }`
							);
						}
					}
				}
				done( null );
			} );
		} );
	} );
} );
