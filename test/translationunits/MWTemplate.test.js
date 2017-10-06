'use strict';

const Adapter = require( '../../lib/Adapter' );
const MWApiRequestManager = require( '../../lib/mw/ApiRequestManager' );
const TestClient = require( '../../lib/mt' ).TestClient;
const TestUtils = require( '../testutils' );
const assert = require( '../utils/assert' );
const async = require( 'async' );
const server = require( '../utils/server' );

const mocks = require( './MWTemplate.mocks.json' );
const tests = require( './MWTemplate.test.json' );

describe( 'Template adaptation', () => {
	const config = server.config;
	config.conf.mtClient = new TestClient( config );
	const api = new MWApiRequestManager( config );
	const mocker = new TestUtils( api );
	mocker.setup( mocks );

	async.each( tests, ( test, done ) => {
		it( test.desc, () => {
			const adapter = new Adapter( test.from, test.to, api, server.config );
			const translationunit = adapter.getAdapter( test.source );
			assert.ok( adapter, 'There is an adapter for templates' );

			// Tests store format data-mw as actual JSON, we need to stringify it
			// to make it appear as returned by parsoid
			if ( test.source.attributes[ 'data-mw' ] ) {
				test.source.attributes[ 'data-mw' ] = JSON.stringify( test.source.attributes[ 'data-mw' ] );
			}

			return translationunit.adapt( test.source ).then( ( adaptedNode ) => {
				const actualDataCX = JSON.parse( adaptedNode.attributes[ 'data-cx' ] );
				const expectedDataCX = test.result.attributes[ 'data-cx' ];
				assert.deepEqual( actualDataCX.adapted, expectedDataCX.adapted, 'Adaptation status matches' );

				const actualDataMW = JSON.parse( adaptedNode.attributes[ 'data-mw' ] );
				const expectedDataMW = test.result.attributes[ 'data-mw' ];
				assert.deepEqual( actualDataMW, expectedDataMW, 'data-mw matches' );
				done( null );
			} );
		} );
	}, mocker.dump.bind( mocker, 'test/translationunits/MWTemplate.mocks.json' ) );
} );
