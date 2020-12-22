'use strict';

const assert = require( '../utils/assert.js' );
const server = require( '../utils/server.js' );
const async = require( 'async' );
const MWApiRequestManager = require( '../../lib/mw/MWApiRequestManager' );
const TitlePairRequest = require( '../../lib/mw/TitlePairRequest' );
const TestUtils = require( '../testutils' );

const mocks = require( './TitlePairTests.mocks.json' );
const tests = require( './TitlePairTests.json' );

// FIXME: This tests title normalization of MWApiRequestManager
describe( 'Title pair tests', () => {
	const api = new MWApiRequestManager( server.config );
	const mocker = new TestUtils( api );

	before( function () {
		mocker.setup( mocks );
	} );

	after( function () {
		mocker.dump( __dirname + '/TitlePairTests.mocks.json' );
	} );

	async.each( tests, ( test ) => {
		const request = api.titlePairRequest(
			test.source,
			test.sourceLanguage,
			test.targetLanguage
		);

		it( 'should adapt the title when: ' + test.desc, function () {
			return request.then( ( result ) => assert.deepEqual( result.targetTitle, test.result ) );
		} );
	} );
} );

describe( 'Title pair tests - batching', function () {
	let oldGetRequestPromise;

	it( 'should have the queue size 50', function () {
		oldGetRequestPromise = TitlePairRequest.prototype.getRequestPromise;
		TitlePairRequest.prototype.getRequestPromise = function ( subqueue ) {
			assert.deepEqual( subqueue.length, 50 );
			return Promise.resolve( {} );
		};
		const titlePairRequest = new TitlePairRequest( {
			sourceLanguage: 'en',
			targetLanguage: 'es',
			context: server.config
		} );
		for ( let i = 0; i < 50; i++ ) {
			titlePairRequest.get( 'Title' + i );
		}
		return Promise.all( titlePairRequest.promises );
	} );
	after( function () {
		TitlePairRequest.prototype.getRequestPromise = oldGetRequestPromise;
	} );
} );
