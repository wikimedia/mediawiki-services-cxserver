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
	<section data-mw-section-id="0">
	<p>Paragraph <b>bold</b> <a href="/wiki/Title">Title</a>.</p>
	</section>
	<section data-mw-section-id="1">
	<h3>Heading</h3>
	<table><tr><td>data</td></tr></table>
	<div>Content<div>innerdiv</div></div>
	</section>
	<section data-mw-section-id="2">
	<p>Content<div>Div in paragraph</div></p>
	<ol><li>Item</li><li>Item</li></ol></section>
	<section data-mw-section-id="3">
	<div typeof="mw:Transclusion" about="#mwt1" data-mw="{}">Block template</div>
	</section>
	<section data-mw-section-id="4">
	<span typeof="mw:Transclusion" about="#mwt2" data-mw="{}">Some text content</span>
	<table about="#mwt2"><tr><td>used value</td></tr></table>
	</section>
	<section data-mw-section-id="5">
	<p>An inline <span typeof="mw:Transclusion" about="#mwt3" data-mw="{}">template</span></p>
	</section>
	<section data-mw-section-id="6">
	<span typeof="mw:Transclusion" about="#mwt4" data-mw="{}">Template 4: Some text content</span>
	<table about="#mwt4"><tr><td>Template 4: value</td></tr></table>
	<span typeof="mw:Transclusion" about="#mwt5" data-mw="{}">Template 5: Some text content</span>
	<table about="#mwt5"><tr><td>Template 5: value</td></tr></table>
	</section>
	<link href="./Category:Oxygen#%20" id="mwCKQ" rel="mw:PageProp/Category" />
	</body>`;

const expectedSectionWrappedHTML = `<body>
	<section rel="cx:Section"><p>Paragraph <b>bold</b> <a href="/wiki/Title">Title</a>.</p></section>
	<section rel="cx:Section"><h3>Heading</h3></section>
	<section rel="cx:Section"><table><tr><td>data</td></tr></table></section>
	<section rel="cx:Section"><div>Content<div>innerdiv</div></div></section>
	<section rel="cx:Section"><p>Content<div>Div in paragraph</div></p></section>
	<section rel="cx:Section"><ol><li>Item</li><li>Item</li></ol></section>
	<section rel="cx:Section">
	<div typeof="mw:Transclusion" about="#mwt1" data-mw="{}">Block template</div>
	</section>
	<section rel="cx:Section">
	<span typeof="mw:Transclusion" about="#mwt2" data-mw='{}'>Some text content</span>
	<table about="#mwt2"><tr><td>used value</td></tr></table>
	</section>
	<section rel="cx:Section">
	<p>An inline <span about="#mwt3" data-mw="{}" typeof="mw:Transclusion">template</span></p>
	</section>
	<section rel="cx:Section">
	<span about="#mwt4" data-mw="{}" typeof="mw:Transclusion">Template 4: Some text content</span>
	<table about="#mwt4"><tr><td>Template 4: value</td></tr></table>
	</section>
	<section rel="cx:Section">
	<span about="#mwt5" data-mw="{}" typeof="mw:Transclusion">Template 5: Some text content</span>
	<table about="#mwt5"><tr><td>Template 5: value</td></tr></table>
	</section>
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
