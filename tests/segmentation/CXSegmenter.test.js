QUnit.module( 'CXSegmenter' );

var fs = require( 'fs' );
QUnit.test( 'Segmentation tests', function ( assert ) {
	var i, len, lang, test, tests, segmenter, result,
		count = 0,testData,expectedResultData,
		allTests = require( './SegmentationTests.json' );

	for ( lang in allTests ) {
		count += allTests[ lang ].length;
	}
	QUnit.expect( count );
	for ( lang in allTests ) {
		tests = allTests[ lang ];
		for ( i = 0, len = allTests[ lang ].length; i < len; i++ ) {
			test = tests[ i ];
			testData = fs.readFileSync( __dirname + '/data/' + test.source, 'utf8' );
			segmenter = new CX.Segmenter( testData, lang );
			segmenter.segment();
			result = segmenter.getSegmentedContent();
			result = result.replace( /(\r\n|\n|\t|\r)/gm, '' );
			expectedResultData = fs.readFileSync( __dirname + '/data/' + test.result, 'utf8' );
			expectedResultData = expectedResultData.replace( /(\r\n|\n|\t|\r)/gm, '' );
			assert.strictEqual( result, expectedResultData, test.desc || '' );
		}
	}
} );
