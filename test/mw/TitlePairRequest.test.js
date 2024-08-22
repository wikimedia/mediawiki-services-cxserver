'use strict';

const { describe, it, after, test } = require( 'node:test' );
const assert = require( '../utils/assert.js' );
const getConfig = require( '../../lib/util' ).getConfig;
const MWApiRequestManager = require( '../../lib/mw/MWApiRequestManager' );
const TitlePairRequest = require( '../../lib/mw/TitlePairRequest' );
const TestUtils = require( '../testutils' );

const mocks = require( './TitlePairTests.mocks.json' );
const tests = require( './TitlePairTests.json' );

// FIXME: This tests title normalization of MWApiRequestManager
test( 'Title pair tests', async ( t ) => {
	const api = new MWApiRequestManager( getConfig() );
	const mocker = new TestUtils( api );

	t.before( () => {
		mocker.setup( mocks );
	} );

	t.after( () => {
		mocker.dump( __dirname + '/TitlePairTests.mocks.json' );
	} );

	for ( const testcase of tests ) {
		await t.test( `should adapt the title when: ${ testcase.desc }`, async () => {
			const result = await api.titlePairRequest(
				testcase.source,
				testcase.sourceLanguage,
				testcase.targetLanguage
			);
			assert.deepEqual( result.targetTitle, testcase.result );
		} );
	}
} );

describe( 'Title pair tests - batching', () => {

	let oldGetRequestPromise;

	it( 'should have the queue size 50', async () => {
		oldGetRequestPromise = TitlePairRequest.prototype.getRequestPromise;
		TitlePairRequest.prototype.getRequestPromise = function ( subqueue ) {
			assert.deepEqual( subqueue.length, 50 );
			return Promise.resolve( {} );
		};
		const titlePairRequest = new TitlePairRequest( {
			sourceLanguage: 'en',
			targetLanguage: 'es',
			context: getConfig()
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
