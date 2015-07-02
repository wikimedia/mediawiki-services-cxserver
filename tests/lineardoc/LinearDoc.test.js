QUnit.module( 'LinearDoc' );

var fs = require( 'fs' ),
	transTests = require( __dirname + '/translate.test.json' );

QUnit.test( 'LinearDoc tests', function ( assert ) {
	var parser, testXhtmlFile, resultXmlFile, resultXhtmlFile, testXhtml, resultXml,
		resultXhtml, i,
		numTests = 3;
	QUnit.expect( 2 * numTests );
	for ( i = 1; i <= numTests; i++ ) {
		testXhtmlFile = __dirname + '/data/test' + i + '.xhtml';
		resultXmlFile = __dirname + '/data/test' + i + '-result.xml';
		resultXhtmlFile = __dirname + '/data/test' + i + '-result.xhtml';

		testXhtml = fs.readFileSync( testXhtmlFile, 'utf8' ).replace( /^\s+|\s+$/, '' );
		resultXml = fs.readFileSync( resultXmlFile, 'utf8' ).replace( /^\s+|\s+$/, '' );
		resultXhtml = fs.readFileSync( resultXhtmlFile, 'utf8' ).replace( /^\s+|\s+$/, '' );
		parser = new CX.LinearDoc.Parser();
		parser.init();
		parser.write( testXhtml );
		assert.strictEqual(
			parser.builder.doc.dumpXml(),
			resultXml,
			'Linearised structure'
		);
		assert.strictEqual(
			parser.builder.doc.getHtml(),
			resultXhtml,
			'Reconstructed XHTML'
		);
	}
} );

QUnit.test( 'LinearDoc translatetags', function ( assert ) {
	var parser, textBlock1, textBlock2, i, len, test, doc;

	QUnit.expect( 2 * transTests.length );

	for ( i = 0, len = transTests.length; i < len; i++ ) {
		test = transTests[ i ];
		parser = new CX.LinearDoc.Parser();
		parser.init();
		parser.write( '<div>' + test.source + '</div>' );
		doc = parser.builder.doc;
		textBlock1 = parser.builder.doc.items[ 1 ].item;
		assert.strictEqual(
			textBlock1.getHtml(),
			test.source,
			'Reconstructed source HTML'
		);
		textBlock2 = textBlock1.translateTags(
			test.targetText,
			test.rangeMappings
		);
		assert.strictEqual(
			textBlock2.getHtml(),
			test.expect,
			'Translated HTML'
		);
	}
} );
