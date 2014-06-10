QUnit.module( 'CXSegmenter' );

var fs = require( 'fs' );

function normalize( html ) {
	var normalizer = new CX.LinearDoc.Normalizer();
	normalizer.init();
	normalizer.write( html.replace( /(\r\n|\n|\t|\r)/gm, '' ) );
	return normalizer.getHtml();
}

QUnit.test( 'Segmentation tests', function ( assert ) {
	var i, len, lang, test, tests, segmenter, result, testData, expectedResultData,
		count = 0,
		skipCount = 0,
		allTests = require( './SegmentationTests.json' );

	for ( lang in allTests ) {
		for ( i = 0, len = allTests[ lang ].length; i < len; i++ ) {
			if ( allTests[ lang ][ i ].skip ) {
				skipCount += 1;
			} else {
				count += 1;
			}
		}
	}
	QUnit.expect( count );
	for ( lang in allTests ) {
		tests = allTests[ lang ];
		for ( i = 0, len = allTests[ lang ].length; i < len; i++ ) {
			test = tests[ i ];
			if ( test.skip ) {
				continue;
			}
			testData = fs.readFileSync( __dirname + '/data/' + test.source, 'utf8' );

			segmenter = new CX.Segmenter( testData, lang );
			segmenter.segment();
			result = normalize( segmenter.getSegmentedContent() );
			expectedResultData = normalize(
				fs.readFileSync( __dirname + '/data/' + test.result, 'utf8' )
			);
			assert.strictEqual( result, expectedResultData, test.source + ': ' + test.desc || '' );
		}
	}
	if ( skipCount > 0 ) {
		console.warn( 'Skipped ' + skipCount + ' tests' );
	}
} );
