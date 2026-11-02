import { describe, it, mock } from 'node:test';
import assert from 'node:assert/strict';
import { compareHTML, deepEqual, fails } from '../utils/assert.js';
import { getConfig } from '../../../lib/util.js';
import MTClient from '../../../lib/mt/MTClient.js';

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

describe( 'Machine translation with wrapped html result', () => {
	it( 'Should throw error', () => {
		const cxConfig = getConfig();
		// Fake the actual call
		mock.method( MTClient.prototype, 'translateHtml', () => Promise.resolve( testDataWithWrappedResult.mtResult ) );
		const mtClient = new MTClient( { conf: cxConfig } );
		fails(
			mtClient.translateReducedHtml(
				testDataWithWrappedResult.sourceLang,
				testDataWithWrappedResult.targetLang,
				testDataWithWrappedResult.input
			),
			( err ) => {
				assert.ok( err instanceof Error );
				assert.ok( /Unexpected content/.test( err.toString() ) );
			}
		);
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

describe( 'Machine translation result with extra spaces', () => {
	it( 'Should be cleaned up', () => {
		const cxConfig = getConfig();
		mock.method( MTClient.prototype, 'translateHtml', () => Promise.resolve( testDataForSpaceIssue.mtResult ) );
		const mtClient = new MTClient( cxConfig );
		return mtClient
			.translateReducedHtml(
				testDataForSpaceIssue.sourceLang,
				testDataForSpaceIssue.targetLang,
				testDataForSpaceIssue.input
			)
			.then( ( result ) => {
				compareHTML( result, testDataForSpaceIssue.sanitizedResult );
			} );
	} );
} );

// T428590: Google adds spaces around inline tags and translates reference labels.
// The first reference is template generated, the second one is a plain reference.
const testDataForReferenceSpaceIssue = {
	input: '<section id="cxTargetSection0"><p><span data-segmentid="1" class="cx-segment">Jews,<sup about="#mwt1" class="mw-ref reference" id="cite_ref-1" rel="dc:references" typeof="mw:Transclusion mw:Extension/ref" data-mw="{}"><a href="./Test#cite_note-1"><span class="mw-reflink-text"><span class="cite-bracket">[</span>d<span class="cite-bracket">]</span></span></a></sup><sup about="#mwt2" class="mw-ref reference" id="cite_ref-2" rel="dc:references" typeof="mw:Extension/ref" data-mw="{}"><a href="./Test#cite_note-2"><span class="mw-reflink-text">[1]</span></a></sup> some historians.</span></p></section>',
	mtInput: '<section id="cxTargetSection0"><p><div id="1"><span id="2">Jews,<sup id="3" typeof="mw:Extension/ref"></sup><sup id="4" typeof="mw:Extension/ref"></sup> some historians.</span></div></p></section>',
	mtResult: '<section id="cxTargetSection0"><p><div id="1"><span id="2">ജൂതന്മാർ, <sup id="3" typeof="mw:Extension/ref"></sup> <sup id="4" typeof="mw:Extension/ref"></sup> ചില ചരിത്രകാരന്മാർ.</span></div></p></section>',
	expected: '<section id="cxTargetSection0"><p><span class="cx-segment" data-segmentid="1">ജൂതന്മാർ,<sup about="#mwt1" class="mw-ref reference" data-mw="{}" id="cite_ref-1" rel="dc:references" typeof="mw:Transclusion mw:Extension/ref"><a href="./Test#cite_note-1"><span class="mw-reflink-text"><span class="cite-bracket">[</span>d<span class="cite-bracket">]</span></span></a></sup><sup about="#mwt2" class="mw-ref reference" data-mw="{}" id="cite_ref-2" rel="dc:references" typeof="mw:Extension/ref"><a href="./Test#cite_note-2"><span class="mw-reflink-text">[1]</span></a></sup> ചില ചരിത്രകാരന്മാർ.</span></p></section>',
	sourceLang: 'en',
	targetLang: 'ml'
};

describe( 'Machine translation result with spaces around references', () => {
	it( 'Should not add spaces before or between references, nor alter reference content', () => {
		const cxConfig = getConfig();
		mock.method( MTClient.prototype, 'translateHtml', ( sourceLang, targetLang, html ) => {
			assert.equal( html, testDataForReferenceSpaceIssue.mtInput );
			return Promise.resolve( testDataForReferenceSpaceIssue.mtResult );
		} );
		const mtClient = new MTClient( cxConfig );
		return mtClient
			.translateReducedHtml(
				testDataForReferenceSpaceIssue.sourceLang,
				testDataForReferenceSpaceIssue.targetLang,
				testDataForReferenceSpaceIssue.input
			)
			.then( ( result ) => {
				compareHTML( result, testDataForReferenceSpaceIssue.expected );
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
		const cxConfig = getConfig();
		const mtClient = new MTClient( cxConfig );
		for ( let i = 0; i < subSequenceTests.length; i++ ) {
			const test = subSequenceTests[ i ];
			const sequencePos = mtClient.findSubSequence(
				test.text, test.subsequence, test.language, test.occurrence
			);
			deepEqual( sequencePos, test.expected, 'Subsequence position correctly spotted.' );
		}
	} );
} );
