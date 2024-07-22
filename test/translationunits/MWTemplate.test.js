'use strict';

const { test } = require( 'node:test' );
const Adapter = require( '../../lib/Adapter' );
const MWApiRequestManager = require( '../../lib/mw/MWApiRequestManager' );
const TestClient = require( '../../lib/mt' ).TestClient;
const TestUtils = require( '../testutils' );
const assert = require( '../utils/assert' );
const server = require( '../utils/server' );

const mocks = require( './MWTemplate.mocks.json' );
const tests = require( './MWTemplate.test.json' );

test( 'Template adaptation', async ( t ) => {
	const cxConfig = server.config;
	cxConfig.conf.mtClient = new TestClient( cxConfig );

	const api = new MWApiRequestManager( cxConfig );
	const mocker = new TestUtils( api );

	t.before( () => {
		mocker.setup( mocks );
	} );

	t.after( () => {
		mocker.dump( __dirname + '/MWTemplate.mocks.json' );
	} );

	for ( const testcase of tests ) {
		await t.test( testcase.desc, async () => {
			const adapter = new Adapter( testcase.from, testcase.to, api, server.config );
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
