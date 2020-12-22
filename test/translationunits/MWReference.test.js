'use strict';

const Adapter = require( '../../lib/Adapter' );
const MWApiRequestManager = require( '../../lib/mw/MWApiRequestManager' );
const TestClient = require( '../../lib/mt' ).TestClient;
const TestUtils = require( '../testutils' );
const assert = require( '../utils/assert' );
const async = require( 'async' );
const server = require( '../utils/server.js' );
const jsdom = require( 'jsdom' );
const fs = require( 'fs' );

const mocks = require( './MWReference.mocks.json' );
const tests = require( './MWReference.test.json' );

describe( 'Reference adaptation', () => {
	const config = server.config;
	config.conf.reduce = true;
	config.conf.mtClient = new TestClient( config );
	const api = new MWApiRequestManager( config );
	const mocker = new TestUtils( api );

	before( function () {
		mocker.setup( mocks );
	} );

	after( function () {
		mocker.dump( __dirname + '/MWReference.mocks.json' );
	} );

	async.each( tests, ( test, done ) => {
		it( test.desc, () => {
			const adapter = new Adapter( test.from, test.to, api, server.config );
			if ( typeof test.source === 'string' ) {
				const content = fs.readFileSync( __dirname + '/data/' + test.source, 'utf8' );
				const sourceDom = new jsdom.JSDOM( content );
				const sourceDomAttributes = sourceDom.window.document.querySelector( '[typeof="mw:Extension/ref"]' ).attributes;
				test.source = {
					name: 'span',
					attributes: {
						id: sourceDomAttributes.getNamedItem( 'id' ).value,
						'data-mw': sourceDomAttributes.getNamedItem( 'data-mw' ).value,
						rel: 'dc:references',
						typeof: 'mw:Extension/ref',
						class: 'mw-ref'
					}
				};
			}
			if ( typeof test.result === 'string' ) {
				const resultContent = fs.readFileSync( __dirname + '/data/' + test.result, 'utf8' );
				const resultDom = new jsdom.JSDOM( resultContent );
				const resultsDomAttributes = resultDom.window.document.querySelector( '[typeof="mw:Extension/ref"]' ).attributes;
				test.result = {
					name: 'span',
					attributes: {
						'data-cx': JSON.parse( resultsDomAttributes.getNamedItem( 'data-cx' ).value )
					}
				};
			}
			assert.ok( adapter, 'There is an adapter for references' );
			const translationunit = adapter.getAdapter( test.source );
			assert.ok( translationunit, 'There is an translationunit for content' );

			return translationunit.adapt( test.source ).then( ( adaptedNode ) => {
				const actualDataCX = JSON.parse( adaptedNode.attributes[ 'data-cx' ] );
				const expectedDataCX = test.result.attributes[ 'data-cx' ];
				assert.deepEqual( actualDataCX, expectedDataCX, 'data-cx matches' );

				if ( test.result.attributes[ 'data-mw' ] ) {
					const expectedDataMW = test.result.attributes[ 'data-mw' ];
					const actualDataMW = JSON.parse( adaptedNode.attributes[ 'data-mw' ] );
					assert.deepEqual( actualDataMW, expectedDataMW, 'data-mw matches' );
				}

				done( null );
			} );
		} );
	} );
} );
