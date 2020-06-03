'use strict';

const assert = require( '../utils/assert.js' );
const server = require( '../utils/server.js' );
const MTClient = require( '../../lib/mt/MTClient.js' );

const testDataWithWrappedResult = {
	input: `<section id="cxTargetSection0">
	<p>
	<span data-segmentid="1" class="cx-segment">This is a sentence</span>
	</p>
	</section>`,
	mtIput: `<section id="cxTargetSection0">
	<p>
	<div id="1"><span id="2">This is a sentence</span></div>
	</p>
	</section>`,
	mtResult: `<html><head></head><body><section id="cxTargetSection0">
	<p>
	<div id="1"><span id="2">Esta es una oración</span></div>
	</p>
	</section></body></html>`,
	sourceLang: 'en',
	targetLang: 'es'
};

describe( 'Machine translation with wrapped html result', function () {
	it( 'Should throw error', () => {
		const cxConfig = server.config.service;
		// Fake the actual call
		const oldTranslateHTML = MTClient.prototype.translateHtml;
		MTClient.prototype.translateHtml = () => {
			return Promise.resolve( testDataWithWrappedResult.mtResult );
		};
		const mtClient = new MTClient( cxConfig );
		assert.fails(
			mtClient.translateReducedHtml(
				testDataWithWrappedResult.sourceLang,
				testDataWithWrappedResult.targetLang,
				testDataWithWrappedResult.input
			),
			function ( err ) {
				MTClient.prototype.translateHtml = oldTranslateHTML;
				assert.ok( err instanceof Error );
				assert.ok( /Unexpected content/.test( err.toString() ) );
			} );
	} );
} );

const testDataForSpaceIssue = {
	input: '<section id="cxTargetSection0"><p><span data-segmentid="20" class="cx-segment"><b id="mwDA">Oktay Rifat</b>, June 1914. </span><span data-segmentid="20" class="cx-segment"><b id="mwDA">Oktay Rifat</b>, August 1914</span></p></section>',
	mtIput: '<section id="cxTargetSection0"><p><div id="1"><span id="2"><b>Oktay Rifat</b>, June 1914. </span><span id="4"><b>Oktay Rifat</b>, August 1914</span></div></p></section>',
	mtResult: '<section id="cxTargetSection0"><p><div id="1"><span id="2"><b>Oktay Rifat</b> , junio de 1914.</span>  <span id="4"><b>Oktay Rifat</b> , augusto 1914</span></div></p></section>',
	sanitizedResult: '<section id="cxTargetSection0"><p><span data-segmentid="20" class="cx-segment"><b>Oktay Rifat</b>, junio de 1914.</span> <span data-segmentid="20" class="cx-segment"><b>Oktay Rifat</b>, augusto 1914</span></p></section>',
	sourceLang: 'en',
	targetLang: 'es'
};

describe( 'Machine translation result with extra spaces', function () {
	it( 'Should be cleaned up', () => {
		const cxConfig = server.config.service;
		const oldTranslateHTML = MTClient.prototype.translateHtml;
		MTClient.prototype.translateHtml = () => {
			return Promise.resolve( testDataForSpaceIssue.mtResult );
		};
		const mtClient = new MTClient( cxConfig );
		return mtClient.translateReducedHtml(
			testDataForSpaceIssue.sourceLang,
			testDataForSpaceIssue.targetLang,
			testDataForSpaceIssue.input
		).then( ( result ) => {
			MTClient.prototype.translateHtml = oldTranslateHTML;
			assert.deepEqual( result, testDataForSpaceIssue.sanitizedResult );
		} );
	} );
} );

const subSequenceTests = [
	{
		text: 'They are subtropical and tropical flowers.',
		subsequence: 'tropical',
		language: 'en',
		occurrence: 0,
		expected: { start: 12, length: 8 }
	},
	{
		text: 'This is test .[3]',
		subsequence: '[3]',
		language: 'en',
		occurrence: 0,
		expected: { start: 14, length: 3 }
	}
];
describe( 'Subsequence match finding', () => {
	it( 'Should return correct range mapping', () => {
		const cxConfig = server.config.service;
		const mtClient = new MTClient( cxConfig );
		for ( let i = 0; i < subSequenceTests.length; i++ ) {
			const test = subSequenceTests[ i ];
			const sequencePos = mtClient.findSubSequence(
				test.text, test.subsequence, test.language, test.occurrence
			);
			assert.deepEqual( sequencePos, test.expected, 'Subsequence position correctly spotted.' );
		}
	} );
} );
