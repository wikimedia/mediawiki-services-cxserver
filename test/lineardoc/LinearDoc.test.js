'use strict';

const assert = require( '../utils/assert' ),
	LinearDoc = require( '../../lib/lineardoc' ),
	fs = require( 'fs' ),
	transTests = require( __dirname + '/translate.test.json' );

function normalize( html ) {
	const normalizer = new LinearDoc.Normalizer();
	normalizer.init();
	normalizer.write( html.replace( /(\r\n|\n|\t|\r)/gm, '' ) );
	return normalizer.getHtml();
}

describe( 'LinearDoc', () => {
	it( 'should be possible to linearise all kind of HTML inputs', () => {
		const numTests = 6;
		for ( let i = 1; i <= numTests; i++ ) {
			const testXhtmlFile = __dirname + '/data/test' + i + '.xhtml';
			const resultXmlFile = __dirname + '/data/test' + i + '-result.xml';
			const resultXhtmlFile = __dirname + '/data/test' + i + '-result.xhtml';

			const testXhtml = fs.readFileSync( testXhtmlFile, 'utf8' ).replace( /^\s+|\s+$/, '' );
			const expectedXml = fs.readFileSync( resultXmlFile, 'utf8' ).replace( /^\s+|\s+$/, '' );
			const expectedXhtml = fs.readFileSync( resultXhtmlFile, 'utf8' ).replace( /^\s+|\s+$/, '' );
			const parser = new LinearDoc.Parser( new LinearDoc.MwContextualizer() );
			parser.init();
			parser.write( testXhtml );
			assert.deepEqual(
				normalize( parser.builder.doc.dumpXml() ),
				normalize( expectedXml ),
				'Linearised structure'
			);
			assert.deepEqual(
				normalize( parser.builder.doc.getHtml() ),
				normalize( expectedXhtml ),
				'Reconstructed XHTML'
			);
		}
	} );

	it( 'should be possible to reconstruct the HTML from LinearDoc', () => {
		for ( let i = 0, len = transTests.length; i < len; i++ ) {
			const test = transTests[ i ];
			const parser = new LinearDoc.Parser( new LinearDoc.MwContextualizer() );
			parser.init();
			parser.write( '<div>' + test.source + '</div>' );
			const textBlock1 = parser.builder.doc.items[ 1 ].item;
			assert.deepEqual(
				textBlock1.getHtml(),
				test.source,
				'Reconstructed source HTML'
			);
			const textBlock2 = textBlock1.translateTags(
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
