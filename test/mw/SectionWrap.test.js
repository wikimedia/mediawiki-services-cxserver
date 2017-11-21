'use strict';

const assert = require( '../utils/assert.js' ),
	LinearDoc = require( '../../lib/lineardoc' );

function normalize( html ) {
	var normalizer = new LinearDoc.Normalizer();
	normalizer.init();
	normalizer.write( html.replace( /[\t\r\n]+/g, '' ) );
	return normalizer.getHtml();
}

function getParsedDoc( content ) {
	const parser = new LinearDoc.Parser( new LinearDoc.MwContextualizer(), {
		wrapSections: true
	} );
	parser.init();
	parser.write( content );
	return parser.builder.doc;
}

/* eslint-disable no-multi-str */
const sourceHTML = `<body>
    <p>Paragraph <b>bold</b> <a href="/wiki/Title">Title</a>.</p>
    <h3>Heading</h3>
    <table><tr><td>data</td></tr></table>
    <div>Content<div>innerdiv</div></div>
    <p>Content<div>Div in paragraph</div></p>
    <ol><li>Item</li><li>Item</li></ol>
    <link href="./Category:Oxygen#%20" id="mwCKQ" rel="mw:PageProp/Category" />
    </body>`;

const expectedSectionWrappedHTML = `<body>
    <section rel="cx:Section"><p>Paragraph <b>bold</b> <a href="/wiki/Title">Title</a>.</p></section>
    <section rel="cx:Section"><h3>Heading</h3></section>
    <section rel="cx:Section"><table><tr><td>data</td></tr></table></section>
    <section rel="cx:Section"><div>Content<div>innerdiv</div></div></section>
    <section rel="cx:Section"><p>Content<div>Div in paragraph</div></p></section>
    <section rel="cx:Section"><ol><li>Item</li><li>Item</li></ol></section>
    <link href="./Category:Oxygen#%20" id="mwCKQ" rel="mw:PageProp/Category" />
    </body>`;

describe( 'Section wrapping test', () => {
	const parsedDoc = getParsedDoc( sourceHTML );
	const result = normalize( parsedDoc.getHtml() );
	const expectedResultData = normalize( expectedSectionWrappedHTML );
	it( 'should not have any errors when section wrapping', () => {
		assert.deepEqual( result, expectedResultData );
	} );
} );
