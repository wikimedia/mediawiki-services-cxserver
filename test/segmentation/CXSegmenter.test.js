'use strict';

var fs = require( 'fs' ),
	lang, i, len, lang, test, tests,
	assert = require( '../utils/assert.js' ),
	LinearDoc = require( '../../lib/lineardoc' ),
	Segmenter = require( '../../lib/segmentation/CXSegmenter' ),
	allTests = require( './SegmentationTests.json' );

function normalize( html ) {
	var normalizer = new LinearDoc.Normalizer();
	normalizer.init();
	normalizer.write( html.replace( /(\r\n|\n|\t|\r)/gm, '' ) );
	return normalizer.getHtml();
}

function runTest( test ) {
	var segmenter, result, testData, expectedResultData;

	describe( 'Segmentation tests', function () {
		testData = fs.readFileSync( __dirname + '/data/' + test.source, 'utf8' );

		segmenter = new Segmenter( testData, lang );
		segmenter.segment();
		result = normalize( segmenter.getSegmentedContent() );
		expectedResultData = normalize(
			fs.readFileSync( __dirname + '/data/' + test.result, 'utf8' )
		);
		it( 'should not have any errors when: ' + test.desc, function () {
			assert.deepEqual( result, expectedResultData, test.source + ': ' + test.desc || '' );
		} );
	} );
}

for ( lang in allTests ) {
	tests = allTests[ lang ];
	len = tests.length;
	for ( i = 0; i < len; i++ ) {
		test = tests[ i ];
		if ( test.skip ) {
			continue;
		}
		runTest( test );
	}
}
