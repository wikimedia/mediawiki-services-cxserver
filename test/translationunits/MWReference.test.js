'use strict';

const Adapter = require( '../../lib/Adapter' );
const MWApiRequestManager = require( '../../lib/mw/ApiRequestManager' );
const TestClient = require( '../../lib/mt' ).TestClient;
const TestUtils = require( '../testutils' );
const assert = require( '../utils/assert' );
const async = require( 'async' );
const server = require( '../utils/server.js' );

// const mocks = require( './MWReference.mocks.json' );
const tests = require( './MWReference.test.json' );

describe( 'Reference adaptation', () => {
	let config = server.config;
	config.conf.mtClient = new TestClient( config );
	const api = new MWApiRequestManager( config );
	// TODO: Currently this is not making any api requests
	const mocker = new TestUtils( api );
	// mocker.setup( mocks );

	async.each( tests, ( test, done ) => {
		it( test.desc, () => {
			const adapter = new Adapter( test.from, test.to, api, server.config );
			const translationunit = adapter.getAdapter( test.source );

			assert.ok( adapter, 'There is an adapter for references' );

			return translationunit.adapt( test.source ).then( ( adaptedNode ) => {
				const expectedDataCX = JSON.parse( adaptedNode.attributes[ 'data-cx' ] );
				const actualDataCX = test.result.attributes[ 'data-cx' ];
				assert.deepEqual( actualDataCX, expectedDataCX, 'data-cx matches' );

				const expectedDataMW = JSON.parse( adaptedNode.attributes[ 'data-mw' ] );
				const actualDataMW = test.result.attributes[ 'data-mw' ];
				assert.deepEqual( actualDataMW, expectedDataMW, 'data-mw matches' );

				done( null );
			} );
		} );
	}, mocker.dump.bind( mocker, 'test/translationunits/MWReference.mocks.json' ) );
} );
