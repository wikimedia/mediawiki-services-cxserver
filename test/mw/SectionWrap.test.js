'use strict';

const assert = require( '../utils/assert.js' ),
	LinearDoc = require( '../../lib/lineardoc' ),
	fs = require( 'fs' ),
	yaml = require( 'js-yaml' );

function normalize( html ) {
	var normalizer = new LinearDoc.Normalizer();
	normalizer.init();
	normalizer.write( html.replace( /[\t\r\n]+/g, '' ) );
	return normalizer.getHtml();
}

function getParsedDoc( content ) {
	const pageloaderConfig = yaml.safeLoad( fs.readFileSync( __dirname + '/../../config/MWPageLoader.yaml' ) );
	const parser = new LinearDoc.Parser( new LinearDoc.MwContextualizer(
		{ removableSections: pageloaderConfig.removableSections }
	), {
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
	<link href="./Category:Category1" id="mwCKQ" rel="mw:PageProp/Category" />
	<link rel="mw:PageProp/Category" href="./Category:All_stub_articles" about="#mwt8" typeof="mw:Transclusion" data-mw='{"parts":[{"template":{"target":{"wt":"nervous-system-drug-stub","href":"./Template:Nervous-system-drug-stub"},"params":{},"i":0}}]}'
	id="mwJg" />
	<link rel="mw:PageProp/Category" href="./Category:Nervous_system_drug_stubs" about="#mwt8" />
	<table class="plainlinks stub" role="presentation" style="background:transparent" about="#mwt8" id="mwJw">
	<tbody></tbody>
	</table>
	<span id="empty_inline_annotation_transclusion" about="#mwt335" typeof="mw:Transclusion" data-mw='{"parts":[{"template":{"target":{"wt":"anchor","href":"./Template:Anchor"},"params":{"1":{"wt":"partial pressure"}},"i":0}}]}'></span>
	<link rel="mw:PageProp/Category" href="./Category:Wikipedia_indefinitely_move-protected_pages#Oxygen" about="#mwt3" typeof="mw:Transclusion" data-mw='{"parts":[{"template":{"target":{"wt":"pp-move-indef","href":"./Template:Pp-move-indef"},"params":{},"i":0}}]}' id="mwBg" />
	<section data-mw-section-id="61">
	<div role="navigation" class="navbox" about="#mwt61" typeof="mw:Transclusion" data-mw="{}">
	Section to be removed from output based on the navbox class
	</div>
	<link rel="mw:PageProp/Category" href="./Category:Food_preparation" about="#mwt61">
	<span about="#mwt61">Fragment 2</span>
	</section>
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
	<figure class="mw-default-size mw-halign-right" id="mweA" typeof="mw:Image/Thumb" rel="cx:Figure">
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
	<table class="plainlinks stub" role="presentation" style="background:transparent" about="#mwt8" id="mwJw">
	<tbody></tbody>
	</table>
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

const sectionWithCategories = `
	<body class="mw-content-ltr sitedir-ltr ltr mw-body-content parsoid-body mediawiki mw-parser-output" dir="ltr" id="mwAA" lang="en">
	<section data-mw-section-id="0">
	<p id="mwAdo">

	<figure-inline about="#mwt87" class="noviewer" data-mw="{&#34;parts&#34;:[{&#34;template&#34;:{&#34;target&#34;:{&#34;wt&#34;:&#34;Commonscat-inline&#34;,&#34;href&#34;:&#34;./Template:Commonscat-inline&#34;},&#34;params&#34;:{&#34;1&#34;:{&#34;wt&#34;:&#34;Attack aircraft&#34;}},&#34;i&#34;:0}}]}" id="mwAds" typeof="mw:Transclusion mw:Image">
	<a href="./File:Commons-logo.svg">
	<link href="./Category:Articles with inline" about="#mwt87" id="mwAd8" rel="mw:PageProp/Category" />
	<img alt="" data-file-height="1376" data-file-type="drawing" data-file-width="1024" height="16" resource="./File:Commons-logo.svg" src="//upload.wikimedia.org/wikipedia/en/thumb/4/4a/Commons-logo.svg/12px-Commons-logo.svg.png" srcset="//upload.wikimedia.org/wikipedia/en/thumb/4/4a/Commons-logo.svg/24px-Commons-logo.svg.png 2x, //upload.wikimedia.org/wikipedia/en/thumb/4/4a/Commons-logo.svg/18px-Commons-logo.svg.png 1.5x" width="12" />
	</a>
	</figure-inline>
	<span about="#mwt87"> Media related to </span>
	<a about="#mwt87" class="cx-link" data-linkid="440" href="https://commons.wikimedia.org/wiki/Category:Attack%20aircraft" rel="mw:WikiLink/Interwiki" title="commons:Category:Attack aircraft">Attack aircraft</a>
	<span about="#mwt87"> at Wikimedia Commons</span>
	</span>
	</p>

	<p>Another para</p>
	<link href="./Category:Fighter_aircraft" id="mwAd4" rel="mw:PageProp/Category" />
	<link href="./Category:Attack_aircraft#%20" id="mwAd8" rel="mw:PageProp/Category" />

	</section>
	</body>`;

const sectionWithCategoriesExpectedHtml = `
	<body class="mw-content-ltr sitedir-ltr ltr mw-body-content parsoid-body mediawiki mw-parser-output" dir="ltr" id="mwAA" lang="en">
	<section rel="cx:Section">

	<p id="mwAdo">
	<figure-inline about="#mwt87" class="noviewer" data-mw="{&#34;parts&#34;:[{&#34;template&#34;:{&#34;target&#34;:{&#34;wt&#34;:&#34;Commonscat-inline&#34;,&#34;href&#34;:&#34;./Template:Commonscat-inline&#34;},&#34;params&#34;:{&#34;1&#34;:{&#34;wt&#34;:&#34;Attack aircraft&#34;}},&#34;i&#34;:0}}]}" id="mwAds" typeof="mw:Transclusion mw:Image">
	<a href="./File:Commons-logo.svg">
	<link about="#mwt87" href="./Category:Articles with inline" id="mwAd8" rel="mw:PageProp/Category" />
	<img alt="" data-file-height="1376" data-file-type="drawing" data-file-width="1024" height="16" resource="./File:Commons-logo.svg" src="//upload.wikimedia.org/wikipedia/en/thumb/4/4a/Commons-logo.svg/12px-Commons-logo.svg.png" srcset="//upload.wikimedia.org/wikipedia/en/thumb/4/4a/Commons-logo.svg/24px-Commons-logo.svg.png 2x, //upload.wikimedia.org/wikipedia/en/thumb/4/4a/Commons-logo.svg/18px-Commons-logo.svg.png 1.5x" width="12" />
	</a>
	</figure-inline><span about="#mwt87"> Media related to </span>
	<a about="#mwt87" class="cx-link" data-linkid="440" href="https://commons.wikimedia.org/wiki/Category:Attack%20aircraft" rel="mw:WikiLink/Interwiki" title="commons:Category:Attack aircraft">Attack aircraft</a>
	<span about="#mwt87"> at Wikimedia Commons</span></span>
	</p>
	</section>

	<section rel="cx:Section">
	<p>Another para</p>
	</section>
	</body>`;

describe( 'Section wrapping test, check extracted categories', () => {
	const parsedDoc = getParsedDoc( sectionWithCategories );
	const result = normalize( parsedDoc.getHtml() );
	const expectedResultData = normalize( sectionWithCategoriesExpectedHtml );
	it( 'should not have any errors when section wrapping and extract categories', () => {
		assert.deepEqual( result, expectedResultData );
		assert.deepEqual( Object.keys( parsedDoc.categories ).length, 2 );
	} );
} );

const nestedSectionsWithTransclusion = `
	<body>
	<section data-mw-section-id="2" id="mwVw">
	<p id="mw5Q">
	<span about="#mwt216" typeof="mw:Transclusion" data-mw="{}" id="mw7Q">10,000</span>
	<span typeof="mw:Entity" about="#mwt216">&nbsp;</span>
	<span about="#mwt216">m (33,000</span>
	<span about="#mwt216">mi)</span> in the
	</p>
	<section data-mw-section-id="3" id="mwXw">
	<h3>Heading</h3>
	<p>Para1</p>
	<p>Para2</p>
	</section>
	</section>
	</body>`;

const nestedSectionsWithTransclusionExpected = `
	<body>
	<section rel="cx:Section">
	<p id="mw5Q">
	<span about="#mwt216" data-mw="{}" id="mw7Q" typeof="mw:Transclusion">10,000</span>
	<span about="#mwt216" typeof="mw:Entity">&nbsp;</span>
	<span about="#mwt216">m (33,000</span>
	<span about="#mwt216">mi)</span> in the</p>
	</section>
	<section rel="cx:Section">
	<h3>Heading</h3>
	</section>
	<section rel="cx:Section">
	<p>Para1</p>
	</section>
	<section rel="cx:Section">
	<p>Para2</p>
	</section>
	</body>`;

describe( 'Section wrapping test, with nested sections and tricky transclusion context', () => {
	const parsedDoc = getParsedDoc( nestedSectionsWithTransclusion );
	const result = normalize( parsedDoc.getHtml() );
	const expectedResultData = normalize( nestedSectionsWithTransclusionExpected );
	it( 'should not have any errors when section wrapping and extract categories', () => {
		assert.deepEqual( result, expectedResultData );
	} );
} );
