'use strict';

var assert = require( '../utils/assert.js' ),
	LinearDoc = require( '../../lib/lineardoc' ),
	fs = require( 'fs' ),
	transTests = require( __dirname + '/translate.test.json' );

describe( 'LinearDoc', function () {
	it( 'should be possible to linearise all kind of HTML inputs', function () {
		var parser, testXhtmlFile, resultXmlFile, resultXhtmlFile, testXhtml, resultXml,
			resultXhtml, i,
			numTests = 5;
		for ( i = 1; i <= numTests; i++ ) {
			testXhtmlFile = __dirname + '/data/test' + i + '.xhtml';
			resultXmlFile = __dirname + '/data/test' + i + '-result.xml';
			resultXhtmlFile = __dirname + '/data/test' + i + '-result.xhtml';

			testXhtml = fs.readFileSync( testXhtmlFile, 'utf8' ).replace( /^\s+|\s+$/, '' );
			resultXml = fs.readFileSync( resultXmlFile, 'utf8' ).replace( /^\s+|\s+$/, '' );
			resultXhtml = fs.readFileSync( resultXhtmlFile, 'utf8' ).replace( /^\s+|\s+$/, '' );
			parser = new LinearDoc.Parser( new LinearDoc.MwContextualizer() );
			parser.init();
			parser.write( testXhtml );
			assert.deepEqual(
				parser.builder.doc.dumpXml(),
				resultXml,
				'Linearised structure'
			);
			assert.deepEqual(
				parser.builder.doc.getHtml(),
				resultXhtml,
				'Reconstructed XHTML'
			);
		}
	} );

	it( 'should be possible to reconstruct the HTML from LinearDoc', function () {
		var parser, textBlock1, textBlock2, i, len, test;

		for ( i = 0, len = transTests.length; i < len; i++ ) {
			test = transTests[ i ];
			parser = new LinearDoc.Parser( new LinearDoc.MwContextualizer() );
			parser.init();
			parser.write( '<div>' + test.source + '</div>' );
			textBlock1 = parser.builder.doc.items[ 1 ].item;
			assert.deepEqual(
				textBlock1.getHtml(),
				test.source,
				'Reconstructed source HTML'
			);
			textBlock2 = textBlock1.translateTags(
				test.targetText,
				test.rangeMappings
			);
			assert.deepEqual(
				textBlock2.getHtml(),
				test.expect,
				'Translated HTML'
			);
		}
	} );
} );
