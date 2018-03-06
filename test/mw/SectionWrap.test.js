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
	<p id="mwAb">Paragraph <b>bold</b> <a href="/wiki/Title">Title</a>.</p>
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
	<figure class="mw-default-size mw-halign-right" id="mweA" typeof="mw:Image/Thumb">
	<a href="./File:PriestleyFuseli.jpg" id="mweQ">
	<img alt="Alt text" data-file-height="587" data-file-type="bitmap" data-file-width="457" height="218" id="mweg" resource="./File:PriestleyFuseli.jpg" src="//upload.wikimedia.org/wikipedia/commons/thumb/4/4a/PriestleyFuseli.jpg/170px-PriestleyFuseli.jpg" srcset="//upload.wikimedia.org/wikipedia/commons/thumb/4/4a/PriestleyFuseli.jpg/340px-PriestleyFuseli.jpg 2x, //upload.wikimedia.org/wikipedia/commons/thumb/4/4a/PriestleyFuseli.jpg/255px-PriestleyFuseli.jpg 1.5x" width="170" /></a>
	<figcaption id="mwew">
	<a href="./Joseph_Priestley" id="mwfA" rel="mw:WikiLink" title="Joseph Priestley">Joseph Priestley</a> is usually given priority in the discovery.
	</figcaption>
	</figure>
	<dl id="mwAW8">
	<dd id="mwAXA">3 Fe + 4 H<sub id="mwAXE">2</sub></dd>
	</dl>
	<link href="./Category:Oxygen#%20" id="mwCKQ" rel="mw:PageProp/Category" />
	<link rel="mw:PageProp/Category" href="./Category:All_stub_articles" about="#mwt8" typeof="mw:Transclusion" data-mw='{"parts":[{"template":{"target":{"wt":"nervous-system-drug-stub","href":"./Template:Nervous-system-drug-stub"},"params":{},"i":0}}]}'
	id="mwJg" />
	<link rel="mw:PageProp/Category" href="./Category:Nervous_system_drug_stubs" about="#mwt8" />
	<table class="metadata plainlinks stub" role="presentation" style="background:transparent" about="#mwt8" id="mwJw">
	<tbody></tbody>
	</table>
	<span id="empty_inline_annotation_transclusion" about="#mwt335" typeof="mw:Transclusion" data-mw='{"parts":[{"template":{"target":{"wt":"anchor","href":"./Template:Anchor"},"params":{"1":{"wt":"partial pressure"}},"i":0}}]}'></span>
	<link rel="mw:PageProp/Category" href="./Category:Wikipedia_indefinitely_move-protected_pages#Oxygen" about="#mwt3" typeof="mw:Transclusion" data-mw='{"parts":[{"template":{"target":{"wt":"pp-move-indef","href":"./Template:Pp-move-indef"},"params":{},"i":0}}]}' id="mwBg" />
	</body>`;

const expectedSectionWrappedHTML = `<body>
	<section rel="cx:Section"><p id="mwAb">Paragraph <b>bold</b> <a href="/wiki/Title">Title</a>.</p></section>
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
	<section rel="cx:Section">
	<figure class="mw-default-size mw-halign-right" id="mweA" typeof="mw:Image/Thumb">
	<a href="./File:PriestleyFuseli.jpg" id="mweQ"><img alt="Alt text" data-file-height="587" data-file-type="bitmap" data-file-width="457" height="218" id="mweg" resource="./File:PriestleyFuseli.jpg" src="//upload.wikimedia.org/wikipedia/commons/thumb/4/4a/PriestleyFuseli.jpg/170px-PriestleyFuseli.jpg" srcset="//upload.wikimedia.org/wikipedia/commons/thumb/4/4a/PriestleyFuseli.jpg/340px-PriestleyFuseli.jpg 2x, //upload.wikimedia.org/wikipedia/commons/thumb/4/4a/PriestleyFuseli.jpg/255px-PriestleyFuseli.jpg 1.5x" width="170" /></a>
	<figcaption id="mwew">
	<a href="./Joseph_Priestley" id="mwfA" rel="mw:WikiLink" title="Joseph Priestley">Joseph Priestley</a> is usually given priority in the discovery.
	</figcaption>
	</figure>
	</section>
	<section rel="cx:Section">
	<dl id="mwAW8">
	<dd id="mwAXA">3 Fe + 4 H<sub id="mwAXE">2</sub></dd>
	</dl>
	</section>
	<section rel="cx:Section">
	<link rel="mw:PageProp/Category" href="./Category:All_stub_articles" about="#mwt8" typeof="mw:Transclusion" data-mw='{"parts":[{"template":{"target":{"wt":"nervous-system-drug-stub","href":"./Template:Nervous-system-drug-stub"},"params":{},"i":0}}]}'
	id="mwJg" />
	<link rel="mw:PageProp/Category" href="./Category:Nervous_system_drug_stubs" about="#mwt8" />
	<table class="metadata plainlinks stub" role="presentation" style="background:transparent" about="#mwt8" id="mwJw">
	<tbody></tbody>
	</table>
	</section>
	<section rel="cx:Section">
	<span id="empty_inline_annotation_transclusion" about="#mwt335" typeof="mw:Transclusion" data-mw='{"parts":[{"template":{"target":{"wt":"anchor","href":"./Template:Anchor"},"params":{"1":{"wt":"partial pressure"}},"i":0}}]}'></span>
	</section>
	<section rel="cx:Section">
	<link rel="mw:PageProp/Category" href="./Category:Wikipedia_indefinitely_move-protected_pages#Oxygen" about="#mwt3" typeof="mw:Transclusion" data-mw='{"parts":[{"template":{"target":{"wt":"pp-move-indef","href":"./Template:Pp-move-indef"},"params":{},"i":0}}]}' id="mwBg" />
	</section>
	</body>`;

describe( 'Section wrapping test', () => {
	const parsedDoc = getParsedDoc( sourceHTML );
	const result = normalize( parsedDoc.getHtml() );
	const expectedResultData = normalize( expectedSectionWrappedHTML );
	it( 'should not have any errors when section wrapping', () => {
		assert.deepEqual( result, expectedResultData );
	} );
} );
