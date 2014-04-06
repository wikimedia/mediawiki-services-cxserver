QUnit.module( 'LinearDoc' );

var fs = require( 'fs' ),
	xhtmlFile = __dirname + '/data/test1.xhtml',
	xmlFile = __dirname + '/data/result1.xml';

QUnit.test( 'LinearDoc tests', function ( assert ) {
	var parser, xhtmlData, xmlData;
	parser = new CX.LinearDoc.Parser();
	parser.init();
	QUnit.expect( 2 );
	xhtmlData = fs.readFileSync( xhtmlFile, 'utf8' ).replace( /^\s+|\s+$/, '' );
	parser.write( xhtmlData );
	xmlData = fs.readFileSync( xmlFile, 'utf8' ).replace( /^\s+|\s+$/, '' );
	assert.strictEqual(
		parser.builder.doc.dumpXml(),
		xmlData,
		'Linearised structure'
	);
	assert.strictEqual(
		parser.builder.doc.getHtml(),
		xhtmlData,
		'Reconstructed XHTML'
	);
} );
