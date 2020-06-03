'use strict';

const fs = require( 'fs' ),
	assert = require( '../utils/assert.js' ),
	LinearDoc = require( '../../lib/lineardoc' ),
	Segmenter = require( '../../lib/segmentation/CXSegmenter' ),
	allTests = require( './SegmentationTests.json' );

function normalize( html ) {
	const normalizer = new LinearDoc.Normalizer();
	normalizer.init();
	normalizer.write( html.replace( /[\t\r\n]+/gm, '' ) );
	return normalizer.getHtml();
}

function getParsedDoc( content ) {
	const parser = new LinearDoc.Parser( new LinearDoc.MwContextualizer() );
	parser.init();
	parser.write( content );
	return parser.builder.doc;
}

function runTest( test, lang ) {
	const testData = fs.readFileSync( __dirname + '/data/' + test.source, 'utf8' );
	const parsedDoc = getParsedDoc( testData );
	const segmenter = new Segmenter();
	const segmentedLinearDoc = segmenter.segment( parsedDoc, lang );
	const result = normalize( segmentedLinearDoc.getHtml() );
	const expectedResultData = normalize(
		fs.readFileSync( __dirname + '/data/' + test.result, 'utf8' )
	);
	it( 'should not have any errors when: ' + test.desc, () => {
		assert.deepEqual( result, expectedResultData, test.source + ': ' + test.desc || '' );
	} );
}

for ( const lang in allTests ) {
	describe( 'Segmentation tests for ' + lang, () => {
		const tests = allTests[ lang ];
		const len = tests.length;
		for ( let i = 0; i < len; i++ ) {
			if ( tests[ i ].skip ) {
				continue;
			}
			runTest( tests[ i ], lang );
		}
	} );
}
