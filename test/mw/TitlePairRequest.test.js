import { after, test } from 'node:test';
import { deepEqual } from '../utils/assert.js';
import { getConfig } from '../../lib/util.js';
import MWApiRequestManager from '../../lib/mw/MWApiRequestManager.js';
import TitlePairRequest from '../../lib/mw/TitlePairRequest.js';
import TestUtils from '../testutils.js';
import { initApp } from '../../app.js';

import mocks from './TitlePairTests.mocks.json' assert { type: 'json' };
import tests from './TitlePairTests.json' assert { type: 'json' };

const dirname = new URL( '.', import.meta.url ).pathname;
// FIXME: This tests title normalization of MWApiRequestManager
test( 'Title pair tests', async ( t ) => {
	let app, api, mocker, oldGetRequestPromise;

	t.before( async () => {
		app = await initApp( getConfig() );
		api = new MWApiRequestManager( app );
		mocker = new TestUtils( api );
		mocker.setup( mocks );
	} );

	t.after( () => {
		mocker.dump( dirname + '/TitlePairTests.mocks.json' );
	} );

	for ( const testcase of tests ) {
		// eslint-disable-next-line no-loop-func
		await t.test( `should adapt the title when: ${ testcase.desc }`, async () => {
			const result = await api.titlePairRequest(
				testcase.source,
				testcase.sourceLanguage,
				testcase.targetLanguage
			);
			deepEqual( result.targetTitle, testcase.result );
		} );
	}

	await t.test( 'should have the queue size 50', async () => {
		oldGetRequestPromise = TitlePairRequest.prototype.getRequestPromise;
		TitlePairRequest.prototype.getRequestPromise = function ( subqueue ) {
			deepEqual( subqueue.length, 50 );
			return Promise.resolve( {} );
		};
		const titlePairRequest = new TitlePairRequest( {
			sourceLanguage: 'en',
			targetLanguage: 'es',
			context: app
		} );
		for ( let i = 0; i < 50; i++ ) {
			titlePairRequest.get( 'Title' + i );
		}
		return await Promise.all( titlePairRequest.promises );
	} );
	after( () => {
		TitlePairRequest.prototype.getRequestPromise = oldGetRequestPromise;
	} );
} );
