'use strict';

const { test } = require( 'node:test' );
const Adapter = require( '../../lib/Adapter' );
const MWApiRequestManager = require( '../../lib/mw/MWApiRequestManager' );
const TestClient = require( '../../lib/mt' ).TestClient;
const TestUtils = require( '../testutils' );
const assert = require( '../utils/assert' );
const getConfig = require( '../../lib/util' ).getConfig;
const mocks = require( './MWTemplate.mocks.json' );
const tests = require( './MWTemplate.test.json' );
const { initApp } = require( '../../app.js' );

test( 'Template adaptation', async ( t ) => {
	let app, api, mocker;

	t.before( async () => {
		app = await initApp( getConfig() );
		api = new MWApiRequestManager( app );
		mocker = new TestUtils( api );
		mocker.setup( mocks );
	} );

	t.after( () => {
		mocker.dump( __dirname + '/MWTemplate.mocks.json' );
	} );

	for ( const testcase of tests ) {
		// eslint-disable-next-line no-loop-func
		await t.test( testcase.desc, async () => {
			app.mtClient = new TestClient( app );
			const adapter = new Adapter( testcase.from, testcase.to, api, app );
			const translationunit = adapter.getAdapter( testcase.source );
			assert.ok( adapter, 'There is an adapter for templates' );

			// Tests store format data-mw as actual JSON, we need to stringify it
			// to make it appear as returned by parsoid
			if ( testcase.source.attributes[ 'data-mw' ] ) {
				testcase.source.attributes[ 'data-mw' ] = JSON.stringify(
					testcase.source.attributes[ 'data-mw' ]
				);
			}

			const adaptedNode = await translationunit.adapt( testcase.source );
			const actualDataCX = JSON.parse( adaptedNode.attributes[ 'data-cx' ] );
			const expectedDataCX = testcase.result.attributes[ 'data-cx' ];
			assert.deepEqual(
				actualDataCX,
				expectedDataCX,
				'Adaptation status matches'
			);

			const actualDataMW = JSON.parse( adaptedNode.attributes[ 'data-mw' ] );
			const expectedDataMW = testcase.result.attributes[ 'data-mw' ];
			assert.deepEqual( actualDataMW, expectedDataMW, 'data-mw matches' );
		} );
	}
} );
