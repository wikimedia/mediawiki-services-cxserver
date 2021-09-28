'use strict';

const fs = require( 'fs' ),
	assert = require( '../utils/assert.js' ),
	server = require( '../utils/server.js' ),
	async = require( 'async' ),
	LinearDoc = require( '../../lib/lineardoc' ),
	MWPageLoader = require( '../../lib/mw/MWPageLoader' );

function normalize( html ) {
	const normalizer = new LinearDoc.Normalizer();
	normalizer.init();
	normalizer.write( html.replace( /[\t\r\n]+/gm, '' ) );
	return normalizer.getHtml();
}

const tests = [
	{
		desc: 'Add data-section-number attribute to every CX section',
		source: 'test-data-section-number.html',
		sourceLanguage: 'en',
		targetLanguage: 'es',
		result: 'result-data-section-number.html'
	}
];
describe( 'MWPageLoader tests', () => {
	async.each( tests, ( test ) => {
		it( 'Test: ' + test.desc, function () {
			// Fake the actual MWPageLoader fetch call
			MWPageLoader.prototype.fetch = () => {
				const sourceContent = fs.readFileSync( __dirname + '/data/' + test.source, 'utf8' );
				return Promise.resolve( { body: sourceContent } );
			};
			const pageloader = new MWPageLoader( {
				context: server.config,
				sourceLanguage: test.sourceLanguage,
				targetLanguage: test.targetLanguage
			} );
			const expectedResultData = normalize(
				fs.readFileSync( __dirname + '/data/' + test.result, 'utf8' )
			);
			return pageloader.getPage( 'mockPage', null, true ).then( ( processedPageContent ) => {
				assert.deepEqual( normalize( processedPageContent.content ), expectedResultData, test.desc );
			} );
		} );
	} );
} );
