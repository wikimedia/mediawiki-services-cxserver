import { test } from 'node:test';
import assert from 'node:assert/strict';
import Adapter from '../../lib/Adapter.js';
import MWApiRequestManager from '../../lib/mw/MWApiRequestManager.js';
import TestClient from '../../lib/mt/TestClient.js';
import TestUtils from '../testutils.js';
import { deepEqual } from '../utils/assert.js';
import { getConfig } from '../../lib/util.js';
import { initApp } from '../../app.js';
import mocks from './MWTemplate.mocks.json' with { type: 'json' };
import tests from './MWTemplate.test.json' with { type: 'json' };

const dirname = new URL( '.', import.meta.url ).pathname;
test( 'Template adaptation', async ( t ) => {
	let app, api, mocker;

	t.before( async () => {
		app = await initApp( getConfig() );
		api = new MWApiRequestManager( app );
		mocker = new TestUtils( api );
		mocker.setup( mocks );
	} );

	t.after( () => {
		mocker.dump( dirname + '/MWTemplate.mocks.json' );
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
			deepEqual( actualDataCX, expectedDataCX, 'Adaptation status matches' );

			const actualDataMW = JSON.parse( adaptedNode.attributes[ 'data-mw' ] );
			const expectedDataMW = testcase.result.attributes[ 'data-mw' ];
			deepEqual( actualDataMW, expectedDataMW, 'data-mw matches' );
		} );
	}
} );
