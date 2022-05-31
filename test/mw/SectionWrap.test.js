'use strict';

const async = require( 'async' ),
	assert = require( '../utils/assert.js' ),
	LinearDoc = require( '../../lib/lineardoc' ),
	fs = require( 'fs' ),
	yaml = require( 'js-yaml' );

function normalize( html ) {
	const normalizer = new LinearDoc.Normalizer();
	normalizer.init();
	normalizer.write( html.replace( /[\t\r\n]+/g, '' ) );
	return normalizer.getHtml();
}

function getParsedDoc( content ) {
	const pageloaderConfig = yaml.load( fs.readFileSync( __dirname + '/../../config/MWPageLoader.yaml' ) );
	const parser = new LinearDoc.Parser( new LinearDoc.MwContextualizer(
		{ removableSections: pageloaderConfig.removableSections }
	), {
		wrapSections: true
	} );
	parser.init();
	parser.write( content );
	return parser.builder.doc;
}

const sourceHTML = `<body>
	<section data-mw-section-id="0">
	<p id="mwAb">Paragraph <b>bold</b> <a href="/wiki/Title">Title</a>.</p>
	</section>
	<section data-mw-section-id="1">
	<h3>Heading</h3>
	<table><tr><td>data</td></tr></table>
	<div id="mwAc">Content<div>innerdiv</div></div>
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
	<figure class="mw-default-size mw-halign-right" id="mweA" typeof="mw:File/Thumb">
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
	<section rel="cx:Section"><div id="mwAc">Content<div>innerdiv</div></div></section>
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
	<figure class="mw-default-size mw-halign-right" id="mweA" typeof="mw:File/Thumb" rel="cx:Figure">
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
	</body>`;

const sectionWithCategories = `
	<body class="mw-content-ltr sitedir-ltr ltr mw-body-content parsoid-body mediawiki mw-parser-output" dir="ltr" id="mwAA" lang="en">
	<section data-mw-section-id="0">
	<p id="mwAdo">

	<span about="#mwt87" class="noviewer" data-mw="{&#34;parts&#34;:[{&#34;template&#34;:{&#34;target&#34;:{&#34;wt&#34;:&#34;Commonscat-inline&#34;,&#34;href&#34;:&#34;./Template:Commonscat-inline&#34;},&#34;params&#34;:{&#34;1&#34;:{&#34;wt&#34;:&#34;Attack aircraft&#34;}},&#34;i&#34;:0}}]}" id="mwAds" typeof="mw:Transclusion mw:Image">
	<a href="./File:Commons-logo.svg">
	<link href="./Category:Articles with inline" about="#mwt87" id="mwAd8" rel="mw:PageProp/Category" />
	<img alt="" data-file-height="1376" data-file-type="drawing" data-file-width="1024" height="16" resource="./File:Commons-logo.svg" src="//upload.wikimedia.org/wikipedia/en/thumb/4/4a/Commons-logo.svg/12px-Commons-logo.svg.png" srcset="//upload.wikimedia.org/wikipedia/en/thumb/4/4a/Commons-logo.svg/24px-Commons-logo.svg.png 2x, //upload.wikimedia.org/wikipedia/en/thumb/4/4a/Commons-logo.svg/18px-Commons-logo.svg.png 1.5x" width="12" />
	</a>
	</span>
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
	<span about="#mwt87" class="noviewer" data-mw="{&#34;parts&#34;:[{&#34;template&#34;:{&#34;target&#34;:{&#34;wt&#34;:&#34;Commonscat-inline&#34;,&#34;href&#34;:&#34;./Template:Commonscat-inline&#34;},&#34;params&#34;:{&#34;1&#34;:{&#34;wt&#34;:&#34;Attack aircraft&#34;}},&#34;i&#34;:0}}]}" id="mwAds" typeof="mw:Transclusion mw:Image">
	<a href="./File:Commons-logo.svg">
	<link about="#mwt87" href="./Category:Articles with inline" id="mwAd8" rel="mw:PageProp/Category" />
	<img alt="" data-file-height="1376" data-file-type="drawing" data-file-width="1024" height="16" resource="./File:Commons-logo.svg" src="//upload.wikimedia.org/wikipedia/en/thumb/4/4a/Commons-logo.svg/12px-Commons-logo.svg.png" srcset="//upload.wikimedia.org/wikipedia/en/thumb/4/4a/Commons-logo.svg/24px-Commons-logo.svg.png 2x, //upload.wikimedia.org/wikipedia/en/thumb/4/4a/Commons-logo.svg/18px-Commons-logo.svg.png 1.5x" width="12" />
	</a>
	</span><span about="#mwt87"> Media related to </span>
	<a about="#mwt87" class="cx-link" data-linkid="440" href="https://commons.wikimedia.org/wiki/Category:Attack%20aircraft" rel="mw:WikiLink/Interwiki" title="commons:Category:Attack aircraft">Attack aircraft</a>
	<span about="#mwt87"> at Wikimedia Commons</span></span>
	</p>
	</section>

	<section rel="cx:Section">
	<p>Another para</p>
	</section>
	</body>`;

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
	<p id="mw6Q">Para1</p>
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
	<p id="mw6Q">Para1</p>
	</section>
	<section rel="cx:Section">
	<p>Para2</p>
	</section>
	</body>`;

const sectionWithBlankTemplate = `
<body>
<section data-mw-section-id="0" id="mwAQ">
<div class="shortdescription nomobile noexcerpt noprint searchaux" style="display:none" about="#mwt3" typeof="mw:Transclusion" data-mw="{}" id="mwAw">City in  Virovitica-Podravina, Croatia</div>
<link rel="mw:PageProp/Category" href="./Category:Articles_with_short_description" about="#mwt3">
<table class="infobox" id="mwBV"></table>
</section>
</body>`;

const sectionWithBlankTemplateExpected = `
<body>
<section rel="cx:Section">
<div about="#mwt3" class="shortdescription nomobile noexcerpt noprint searchaux" data-mw="{}" id="mwAw" style="display:none" typeof="mw:Transclusion">City in  Virovitica-Podravina, Croatia</div>
<link about="#mwt3" href="./Category:Articles_with_short_description" rel="mw:PageProp/Category"></link>
</section>
<section rel="cx:Section">
<table class="infobox" id="mwBV"></table></section>
</body>`;

const wholeBodySource = `
<html>
<head></head>
<body id="mwAA" lang="en" >
<section data-mw-section-id="1" id="mwAQ">
<div typeof="mw:Transclusion" about="#mwt2" data-mw="{}" id="mwAw">Some text content</div>
<table about="#mwt2"><tr><td>used value</td></tr></table>
</section>
<section data-mw-section-id="2" id="mwAQ">
<span typeof="mw:Transclusion" about="#mwt3" data-mw="{}" id="mwAw">Some text content</span>
<table about="#mwt3"><tr><td>used value</td></tr></table>
</section>
</body>
</html>`;

const wholeBodyResult = `
<html>
<head></head>
<body id="mwAA" lang="en">
<section rel="cx:Section">
<div about="#mwt2" data-mw="{}" id="mwAw" typeof="mw:Transclusion">Some text content</div>
<table about="#mwt2"><tr><td>used value</td></tr></table>
</section>
<section rel="cx:Section">
<span about="#mwt3" data-mw="{}" id="mwAw" typeof="mw:Transclusion">Some text content</span>
<table about="#mwt3"><tr><td>used value</td></tr></table>
</section>
</body>
</html>`;

const sectionWithMeta = `
<body id="mwAA" lang="he">
<section data-mw-section-id="0" id="mwAQ">
<meta property="mw:PageProp/displaytitle" content="פלמינג: האיש שרצה להיות בונד" id="mwAg" />
<table class="infobox" style="width: 270px; font-size: 95%;" about="#mwt2" typeof="mw:Transclusion" data-mw='{}' id="mwAw">
	<caption style="background: #C6C9FF;  border:1px solid #aaaaaa; border-bottom:0px;">פלמינג: האיש שרצה להיות
		בונד<br />Fleming: The Man Who Would Be Bond</caption>
	<tbody>
		<tr>
			<td colspan="2" style="text-align:center"></td>
		</tr>
	</tbody>
</table>
<link rel="mw:PageProp/Category" href="./קטגוריה:ויקינתונים_-_השוואת_ערכים:_חסר" about="#mwt2" />
<p id="mwBQ"><b id="mwBg">פלמינג: האיש שרצה להיות בונד</b></p>
</section>
</body>
`;

const sectionWithMetaResult = `
<body id="mwAA" lang="he">
<section rel="cx:Section">
<meta content="פלמינג: האיש שרצה להיות בונד" id="mwAg" property="mw:PageProp/displaytitle" />
</section>
<section rel="cx:Section">
<table about="#mwt2" class="infobox" data-mw="{}" id="mwAw" style="width: 270px; font-size: 95%;" typeof="mw:Transclusion">
<caption style="background: #C6C9FF;  border:1px solid #aaaaaa; border-bottom:0px;">פלמינג: האיש שרצה להיותבונד
<br />Fleming: The Man Who Would Be Bond</caption>
<tbody>
<tr><td colspan="2" style="text-align:center"></td></tr></tbody>
</table><link about="#mwt2" href="./קטגוריה:ויקינתונים_-_השוואת_ערכים:_חסר" rel="mw:PageProp/Category" />
</section>
<section rel="cx:Section">
<p id="mwBQ"><b id="mwBg">פלמינג: האיש שרצה להיות בונד</b>
</p>
</section>
</body>"
`;

const sectionWithFigureInlineTemplate = `
<html>
	<body>
	<h2 id="Enlaces_externos">Enlaces externos</h2>
	<ul id="mwASA">
		<li id="mwASE"><a rel="mw:ExtLink"
				href="http://www.portaloaca.com/historia/otroshistoria/94-la-leyenda-de-la-mano-negra.html"
				class="external text" id="mwASI">La leyenda de La Mano Negra</a></li>
	</ul>
	<span about="#mwt92" typeof="mw:Transclusion"
		data-mw="{&quot;parts&quot;:[{&quot;template&quot;:{&quot;target&quot;:{&quot;wt&quot;:&quot;commonscat&quot;,&quot;href&quot;:&quot;./Plantilla:Commonscat&quot;},&quot;params&quot;:{&quot;1&quot;:{&quot;wt&quot;:&quot;La Mano Negra&quot;}},&quot;i&quot;:0}},&quot;\\n\\n[[Categoría:Historia de la provincia de Cádiz]]\\n[[Categoría:Derecho de Andalucía]]\\n[[Categoría:Casos judiciales de España]]\\n[[Categoría:Sociedades secretas]]\\n[[Categoría:Reinado de Alfonso XII]]\\n[[Categoría:Casos judiciales anarquistas]]\\n[[Categoría:Teorías conspirativas]]\\n[[Categoría:Historia del anarquismo]]\\n[[Categoría:Anarquismo en España]]\\n[[Categoría:España en 1882]]\\n[[Categoría:España en 1883]]\\n[[Categoría:España en 1884]]\\n[[Categoría:Política en 1882]]\\n[[Categoría:Política en 1883]]\\n[[Categoría:Política en 1884]]\\n[[Categoría:Atentados anarquistas]]&quot;]}"
		id="mwASk">
	</span>
	<ul about="#mwt92">
		<li>
			<span typeof="mw:Image">
			<span>
				<img alt="" resource="./Archivo:Commons-logo.svg" src="//upload.wikimedia.org/wikipedia/commons/thumb/4/4a/Commons-logo.svg/15px-Commons-logo.svg.png" data-file-width="1024" data-file-height="1376" data-file-type="drawing" height="20" width="15" srcset="//upload.wikimedia.org/wikipedia/commons/thumb/4/4a/Commons-logo.svg/30px-Commons-logo.svg.png 2x, //upload.wikimedia.org/wikipedia/commons/thumb/4/4a/Commons-logo.svg/23px-Commons-logo.svg.png 1.5x">
			</span>
			</span>
			<a rel="mw:WikiLink" href="./Wikimedia_Commons" title="Wikimedia Commons">Wikimedia Commons</a> alberga una categoría multimedia sobre<b><a rel="mw:WikiLink/Interwiki" href="https://commons.wikimedia.org/wiki/Category:La%20Mano%20Negra" title="commons:Category:La Mano Negra">La Mano Negra</a></b>.
			<link rel="mw:PageProp/Category" href="./Categoría:Historia_de_la_provincia_de_Cádiz">
			<link rel="mw:PageProp/Category" href="./Categoría:Derecho_de_Andalucía">
		</li>
	</ul>
</body>
</html>
`;

const sectionWithFigureInlineTemplateResult = `
<html>
<body>
	<section rel="cx:Section">
	<h2 id="Enlaces_externos">Enlaces externos</h2>
	</section>
	<section rel="cx:Section">
		<ul id="mwASA">
			<li id="mwASE">
				<a class="external text" href="http://www.portaloaca.com/historia/otroshistoria/94-la-leyenda-de-la-mano-negra.html" id="mwASI" rel="mw:ExtLink">La leyenda de La Mano Negra</a>
			</li>
		</ul>
	</section>
	<section rel="cx:Section">
		<span about="#mwt92" data-mw="{&quot;parts&quot;:[{&quot;template&quot;:{&quot;target&quot;:{&quot;wt&quot;:&quot;commonscat&quot;,&quot;href&quot;:&quot;./Plantilla:Commonscat&quot;},&quot;params&quot;:{&quot;1&quot;:{&quot;wt&quot;:&quot;La Mano Negra&quot;}},&quot;i&quot;:0}},&quot;\\n\\n[[Categoría:Historia de la provincia de Cádiz]]\\n[[Categoría:Derecho de Andalucía]]\\n[[Categoría:Casos judiciales de España]]\\n[[Categoría:Sociedades secretas]]\\n[[Categoría:Reinado de Alfonso XII]]\\n[[Categoría:Casos judiciales anarquistas]]\\n[[Categoría:Teorías conspirativas]]\\n[[Categoría:Historia del anarquismo]]\\n[[Categoría:Anarquismo en España]]\\n[[Categoría:España en 1882]]\\n[[Categoría:España en 1883]]\\n[[Categoría:España en 1884]]\\n[[Categoría:Política en 1882]]\\n[[Categoría:Política en 1883]]\\n[[Categoría:Política en 1884]]\\n[[Categoría:Atentados anarquistas]]&quot;]}" id="mwASk" typeof="mw:Transclusion"></span>
		<ul about="#mwt92">
			<li>
				<span typeof="mw:Image">
				<span>
					<img alt="" data-file-height="1376" data-file-type="drawing" data-file-width="1024" height="20" resource="./Archivo:Commons-logo.svg" src="//upload.wikimedia.org/wikipedia/commons/thumb/4/4a/Commons-logo.svg/15px-Commons-logo.svg.png" srcset="//upload.wikimedia.org/wikipedia/commons/thumb/4/4a/Commons-logo.svg/30px-Commons-logo.svg.png 2x, //upload.wikimedia.org/wikipedia/commons/thumb/4/4a/Commons-logo.svg/23px-Commons-logo.svg.png 1.5x" width="15"></img>
				</span>
				</span>
				<a href="./Wikimedia_Commons" rel="mw:WikiLink" title="Wikimedia Commons">Wikimedia Commons</a> alberga una categoría multimedia sobre<b><a href="https://commons.wikimedia.org/wiki/Category:La%20Mano%20Negra" rel="mw:WikiLink/Interwiki" title="commons:Category:La Mano Negra">La Mano Negra</a></b>.
			</li>
		</ul>
	</section>
</body>
</html>
`;

const sectionWithIgnorableTransclusionFragment = `
<body>
	<section data-mw-section-id="0" id="mwAQ">
		<span about="#mwt4" typeof="mw:Transclusion"
			data-mw="{&quot;parts&quot;:[{&quot;template&quot;:{&quot;target&quot;:{&quot;wt&quot;:&quot;Generations Sidebar&quot;,&quot;href&quot;:&quot;./Template:Generations_Sidebar&quot;},&quot;params&quot;:{},&quot;i&quot;:0}}]}"
			id="mwCA">
		</span>
		<table class="vertical-navbox nowraplinks plainlist"
			about="#mwt4" id="mwCQ">
			<tbody>
			</tbody>
		</table>
	</section>
	<section data-mw-section-id="1" id="mwFg">
		<h2 id="Terminology">Terminology</h2>
	</section>
</body>
`;
const sectionWithIgnorableTransclusionFragmentResult = `
<body>
	<section rel="cx:Section">
		<span about="#mwt4" typeof="mw:Transclusion"
			data-mw="{&quot;parts&quot;:[{&quot;template&quot;:{&quot;target&quot;:{&quot;wt&quot;:&quot;Generations Sidebar&quot;,&quot;href&quot;:&quot;./Template:Generations_Sidebar&quot;},&quot;params&quot;:{},&quot;i&quot;:0}}]}"
			id="mwCA">
		</span>
	</section>
	<section rel="cx:Section">
		<h2 id="Terminology">Terminology</h2>
	</section>
</body>
`;

const sectionWithTemplateAndTemplateStyles = `
<body>
	<section data-mw-section-id="0" id="mwAQ">
	<ul>
	<li>
		<link rel="mw-deduplicated-inline-style" href="mw-data:TemplateStyles:r886058088" about="#mwt79"
		typeof="mw:Extension/templatestyles mw:Transclusion"
		data-mw="{&quot;parts&quot;:[{&quot;template&quot;:{&quot;target&quot;:{&quot;wt&quot;:&quot;ISBN&quot;,&quot;href&quot;:&quot;./Template:ISBN&quot;},&quot;params&quot;:{&quot;1&quot;:{&quot;wt&quot;:&quot;0-7100-9224-5&quot;}},&quot;i&quot;:0}}]}"
		id="mwAQE">

		<a rel="mw:WikiLink" href="./International_Standard_Book_Number"
		title="International Standard Book Number" about="#mwt79">ISBN</a>

		<span typeof="mw:Entity"
		about="#mwt79">&nbsp;</span>

		<a rel="mw:WikiLink" href="./Special:BookSources/0-7100-9224-5"
		title="Special:BookSources/0-7100-9224-5" about="#mwt79" id="mwAQI">0-7100-9224-5</a>

	</li>
	</ul>
	</section>
</body>
`;

const sectionWithTemplateAndTemplateStylesResult = `
<body>
	<section rel="cx:Section">
	<ul>
	<li>
		<link rel="mw-deduplicated-inline-style" href="mw-data:TemplateStyles:r886058088" about="#mwt79"
		typeof="mw:Extension/templatestyles mw:Transclusion"
		data-mw="{&quot;parts&quot;:[{&quot;template&quot;:{&quot;target&quot;:{&quot;wt&quot;:&quot;ISBN&quot;,&quot;href&quot;:&quot;./Template:ISBN&quot;},&quot;params&quot;:{&quot;1&quot;:{&quot;wt&quot;:&quot;0-7100-9224-5&quot;}},&quot;i&quot;:0}}]}"
		id="mwAQE">
		</link>
		<a rel="mw:WikiLink" href="./International_Standard_Book_Number"
		title="International Standard Book Number" about="#mwt79">ISBN</a>

		<span typeof="mw:Entity"
		about="#mwt79">&nbsp;</span>

		<a rel="mw:WikiLink" href="./Special:BookSources/0-7100-9224-5"
		title="Special:BookSources/0-7100-9224-5" about="#mwt79" id="mwAQI">0-7100-9224-5</a>

	</li>
	</ul>
	</section>
</body>
`;

const tests = [
	{
		desc: 'section has common pattern of elements',
		source: sourceHTML,
		result: expectedSectionWrappedHTML,
		categories: 1
	},
	{
		desc: 'section has categories to be extracted',
		source: sectionWithCategories,
		result: sectionWithCategoriesExpectedHtml,
		categories: 2
	},
	{
		desc: 'content has nested sections and tricky transclusion context',
		source: nestedSectionsWithTransclusion,
		result: nestedSectionsWithTransclusionExpected,
		categories: 0
	},
	{
		desc: 'content has blank template and then an unrelated table',
		source: sectionWithBlankTemplate,
		result: sectionWithBlankTemplateExpected,
		categories: 0
	},
	{
		desc: 'content is complete page content with html, head tags and body having two templates with fragments',
		source: wholeBodySource,
		result: wholeBodyResult,
		categories: 0
	},
	{
		desc: 'Content has self closing meta tag',
		source: sectionWithMeta,
		result: sectionWithMetaResult,
		categories: 0
	},
	{
		desc: 'Content has template fragments and one fragment is a section candidate. Section has categories too',
		source: sectionWithFigureInlineTemplate,
		result: sectionWithFigureInlineTemplateResult,
		categories: 2
	},
	{
		desc: 'Content has transclusion and one of its fragment get removed since it is ignorable.',
		source: sectionWithIgnorableTransclusionFragment,
		result: sectionWithIgnorableTransclusionFragmentResult,
		categories: 0
	},
	{
		desc: 'Content has transclusion and same element is removable templatestyle. So do not remove',
		source: sectionWithTemplateAndTemplateStyles,
		result: sectionWithTemplateAndTemplateStylesResult,
		categories: 0
	}
];

describe( 'Section wrap tests', () => {
	async.forEach( tests, ( test ) => {
		const parsedDoc = getParsedDoc( test.source );
		const wrappedSectionDoc = parsedDoc.wrapSections();
		const result = normalize( wrappedSectionDoc.getHtml() );
		const expectedResultData = normalize( test.result );
		it( 'should parse correctly when ' + test.desc, () => {
			assert.deepEqual( result, expectedResultData );
		} );
		it( 'should extract correct number of categories when ' + test.desc, () => {
			assert.deepEqual( parsedDoc.categories.length, test.categories );
		} );
	} );
} );
