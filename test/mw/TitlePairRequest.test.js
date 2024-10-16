'use strict';

const { after, test } = require( 'node:test' );
const assert = require( '../utils/assert.js' );
const getConfig = require( '../../lib/util' ).getConfig;
const MWApiRequestManager = require( '../../lib/mw/MWApiRequestManager' );
const TitlePairRequest = require( '../../lib/mw/TitlePairRequest' );
const TestUtils = require( '../testutils' );
const { initApp } = require( '../../app.js' );

const mocks = require( './TitlePairTests.mocks.json' );
const tests = require( './TitlePairTests.json' );

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
		mocker.dump( __dirname + '/TitlePairTests.mocks.json' );
	} );

	for ( const testcase of tests ) {
		// eslint-disable-next-line no-loop-func
		await t.test( `should adapt the title when: ${ testcase.desc }`, async () => {
			const result = await api.titlePairRequest(
				testcase.source,
				testcase.sourceLanguage,
				testcase.targetLanguage
			);
			assert.deepEqual( result.targetTitle, testcase.result );
		} );
	}

	await t.test( 'should have the queue size 50', async () => {
		oldGetRequestPromise = TitlePairRequest.prototype.getRequestPromise;
		TitlePairRequest.prototype.getRequestPromise = function ( subqueue ) {
			assert.deepEqual( subqueue.length, 50 );
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
