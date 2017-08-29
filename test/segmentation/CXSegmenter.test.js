'use strict';

const fs = require( 'fs' ),
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

function runTest( test, lang ) {
	let testData = fs.readFileSync( __dirname + '/data/' + test.source, 'utf8' );

	let segmenter = new Segmenter( testData, lang );
	segmenter.segment();
	let result = normalize( segmenter.getSegmentedContent() );
	let expectedResultData = normalize(
		fs.readFileSync( __dirname + '/data/' + test.result, 'utf8' )
	);
	it( 'should not have any errors when: ' + test.desc, () => {
		assert.deepEqual( result, expectedResultData, test.source + ': ' + test.desc || '' );
	} );
}

for ( let lang in allTests ) {
	describe( 'Segmentation tests for ' + lang, () => {
		let tests = allTests[ lang ];
		let len = tests.length;
		for ( let i = 0; i < len; i++ ) {
			if ( tests[ i ].skip ) {
				continue;
			}
			runTest( tests[ i ], lang );
		}
	} );
}
