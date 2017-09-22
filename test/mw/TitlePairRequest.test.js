'use strict';

var tests,
	assert = require( '../utils/assert.js' ),
	server = require( '../utils/server.js' ),
	async = require( 'async' ),
	TitlePairRequest = require( '../../lib/mw/TitlePairRequest' );

tests = [
	{
		source: 'Kerala',
		result: 'കേരളം',
		sourceLanguage: 'en',
		targetLanguage: 'ml',
		desc: 'Corresponding title exist in target language'
	},
	{
		source: 'Sea',
		result: 'Mar',
		sourceLanguage: 'en',
		targetLanguage: 'es',
		desc: 'Corresponding title exist in target language'
	},
	{
		source: 'Atomic number',
		result: 'Número atómico',
		sourceLanguage: 'en',
		targetLanguage: 'es',
		desc: 'Corresponding title exist in target language and given title need normalization'
	},
	{
		source: 'This title does not exist in English wikipedia',
		result: undefined,
		sourceLanguage: 'en',
		targetLanguage: 'es',
		desc: 'Corresponding title does not exist in target language and given title need normalization'
	},
	{
		source: 'Group_(periodic_table)',
		result: 'ଶ୍ରେଣୀ (ପର୍ଯ୍ୟାୟ ସାରଣୀ)',
		sourceLanguage: 'en',
		targetLanguage: 'or',
		desc: 'Corresponding title exist in target language and given title need normalization, has parenthesis'
	}
];

describe( 'Title pair tests', function () {
	async.forEach( tests, function ( test ) {
		var request;

		request = new TitlePairRequest( {
			sourceLanguage: test.sourceLanguage,
			targetLanguage: test.targetLanguage,
			context: server.config
		} );
		it( 'should adapt the title when: ' + test.desc, function () {
			return request.get( test.source ).then( function ( result ) {
				assert.deepEqual( result.targetTitle, test.result );
			} );
		} );
	} );
} );

describe( 'Title pair tests - batching', function () {
	var oldGetRequestPromise;

	it( 'should have the queue size 50', function () {
		var i, titlePairRequest;
		oldGetRequestPromise = TitlePairRequest.prototype.getRequestPromise;
		TitlePairRequest.prototype.getRequestPromise = function ( subqueue ) {
			assert.deepEqual( subqueue.length, 50 );
			return Promise.resolve( {} );
		};
		titlePairRequest = new TitlePairRequest( {
			sourceLanguage: 'en',
			targetLanguage: 'es',
			context: server.config
		} );
		for ( i = 0; i < 50; i++ ) {
			titlePairRequest.get( 'Title' + i );
		}
		return Promise.all( titlePairRequest.promises );
	} );
	after( function () {
		TitlePairRequest.prototype.getRequestPromise = oldGetRequestPromise;
	} );
} );
