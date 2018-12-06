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
		// Fake the actual Yandex call
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
