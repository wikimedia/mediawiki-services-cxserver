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
		const numTests = 7;
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
			assert.ok( !LinearDoc.Utils.isBlockTemplate( parser.builder.doc ), 'Not a section with block template' );
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

	it( 'should be possible to reduce and expand a document', () => {
		const testXhtmlFile = __dirname + '/data/test-figure-inline.html';
		const contentForReduce = fs.readFileSync( testXhtmlFile, 'utf8' ).replace( /^\s+|\s+$/, '' );
		const parser = new LinearDoc.Parser( new LinearDoc.MwContextualizer() );
		parser.init();
		parser.write( contentForReduce );
		const { reducedDoc, attrDump } = parser.builder.doc.reduce();
		assert.deepEqual( Object.keys( attrDump ).length, 16, 'Attributes for 16 tags extracted.' );
		let expandedDoc = reducedDoc.expand( attrDump );
		assert.deepEqual(
			normalize( expandedDoc.getHtml() ),
			normalize( contentForReduce ),
			'Restored the original html after reduce and expand.'
		);
	} );

	it( 'test HTML compaction roundtrip with inline chunks', () => {
		const testXhtmlFile = __dirname + '/data/test-chunks-inline.html';
		const contentForReduce = fs.readFileSync( testXhtmlFile, 'utf8' ).replace( /^\s+|\s+$/, '' );
		const parser = new LinearDoc.Parser( new LinearDoc.MwContextualizer() );
		parser.init();
		parser.write( contentForReduce );
		const { reducedDoc, attrDump } = parser.builder.doc.reduce();
		assert.deepEqual( Object.keys( attrDump ).length, 22, 'Attributes for 22 tags extracted.' );
		let expandedDoc = reducedDoc.expand( attrDump );
		assert.deepEqual(
			normalize( expandedDoc.getHtml() ),
			normalize( contentForReduce ),
			'Restored the original html after reduce and expand.'
		);
	} );

	it( 'test HTML expand with external attributes inserted', () => {
		const corruptedDoc = `<p id="1">
			<b id="2" onclick="doSomething();">Externally inserted attribute.</b>
			<a href="navigateThere();">Externally inserted tag</a>
			<span id="mwEz">Element with only id attribute is fine.</span>
			</p>`;
		const sanitizedExpandedDoc = `<p class="paragraph" id="mwEq">
			<b class="bold" id="mwEs">Externally inserted attribute.</b>
			<a>Externally inserted tag</a>
			<span id="mwEz">Element with only id attribute is fine.</span>
			</p>`;
		const attrDump = {
			1: { id: 'mwEq', 'class': 'paragraph' },
			2: { id: 'mwEs', 'class': 'bold' }
		};
		const parser = new LinearDoc.Parser( new LinearDoc.MwContextualizer() );
		parser.init();
		parser.write( corruptedDoc );
		let expandedDoc = parser.builder.doc.expand( attrDump );
		assert.deepEqual(
			normalize( expandedDoc.getHtml() ),
			normalize( sanitizedExpandedDoc ),
			'Expanded the corrupted document by removing all externally inserted attributes.'
		);
	} );

	it( 'test if the content is block level template', () => {
		const testXhtmlFile = __dirname + '/data/test-block-template-section.html';
		const contentForTest = fs.readFileSync( testXhtmlFile, 'utf8' ).replace( /^\s+|\s+$/, '' );
		const parser = new LinearDoc.Parser( new LinearDoc.MwContextualizer() );
		parser.init();
		parser.write( contentForTest );
		assert.ok( LinearDoc.Utils.isBlockTemplate( parser.builder.doc ), 'Section with block template' );
	} );
} );
