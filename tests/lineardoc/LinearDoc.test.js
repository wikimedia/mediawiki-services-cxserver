QUnit.module( 'LinearDoc' );

var fs = require( 'fs' );

QUnit.test( 'LinearDoc tests', function ( assert ) {
	var parser, testXhtmlFile, resultXmlFile, resultXhtmlFile, testXhtml, resultXml,
		resultXhtml, i,
		numTests = 2;
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
