QUnit.module( 'CXSegmenter' );

QUnit.test( 'Segmentation tests', function ( assert ) {
	var i, len, lang, test, tests, segmenter, result,
		count = 0,
		allTests = require( './SegmentationTests.json' );

	for ( lang in allTests ) {
		count += allTests[ lang ].length;
	}
	QUnit.expect( count );
	for ( lang in allTests ) {
		tests = allTests[ lang ];
		for ( i = 0, len = allTests[ lang ].length; i < len; i++ ) {
			test = tests[ i ];
			segmenter = new CX.Segmenter( test.source, lang );
			segmenter.segment();
			result = segmenter.getSegmentedContent();
			result = result.replace( /(\r\n|\n|\t|\r)/gm, '' );
			assert.strictEqual( result, test.result, test.desc || '' );
		}
	}
} );
