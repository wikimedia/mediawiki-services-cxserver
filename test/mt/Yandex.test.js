import { describe, it } from 'node:test';
import { compareHTML, fails } from '../utils/assert.js';
import { getConfig } from '../../lib/util.js';
import Yandex from '../../lib/mt/Yandex.js';

const testData = {
	input: `<section id="cxTargetSection0">
	<p>
	<span data-segmentid="1" class="cx-segment">This is a sentence, <i id="mwCg">
	<a href="./Auri_(album)" rel="mw:WikiLink" data-linkid="41" class="mw-redirect cx-link" id="mwCw" title="Auri (album)">a link in italics</a></i></span>
	</p>
	</section>`,
	mtIput: `<section id="cxTargetSection0">
	<p>
	<div id="1"><span id="2">This is a sentence, <i id="mwCg">
	<a id="3">a link in italics</a></i></span></div>
	</p>
	</section>`,
	mtResult: `<section id="cxTargetSection0">
	<p>
	<div id="1"><span id="2">Esta es una oración,, <i id="mwCg">
	<a id="3" href="badLocation" onclick="bad();">un enlace en cursiva</a></i></span></div>
	<script>Evil script</script>
	<iframe//src=jAva&Tab;script:alert(3)>
	</p>
	</section>`,
	sourceLang: 'en',
	targetLang: 'es',
	expectedResult: `<section id="cxTargetSection0">
	<p>
	<span data-segmentid="1" class="cx-segment">Esta es una oración,, <i id="mwCg">
	<a title="Auri (album)" rel="mw:WikiLink" id="mwCw" href="./Auri_(album)" data-linkid="41" class="mw-redirect cx-link">un enlace en cursiva</a></i></span>
	</p>
	</section>`
};

describe( 'Yandex machine translation with corrupted result', () => {
	it( 'Should sanitize the MT output', () => {
		const cxConfig = getConfig();
		// Fake the actual Yandex call
		const oldTranslateHTML = Yandex.prototype.translateHtml;
		const normalize = ( html ) => html.replace( /[\t\r\n]+/g, '' );
		Yandex.prototype.translateHtml = ( sourceLang, targetLang, mtInput ) => {
			compareHTML( normalize( mtInput ), normalize( testData.mtIput ) );
			return Promise.resolve( testData.mtResult );
		};
		const yandex = new Yandex( cxConfig );
		return yandex.translate( testData.sourceLang, testData.targetLang, testData.input )
			.then( ( result ) => {
				compareHTML( normalize( result ), normalize( testData.expectedResult ) );
				Yandex.prototype.translateHtml = oldTranslateHTML;
			} );
	} );
} );

describe( 'Yandex machine translation', () => {
	it( 'Should fail because of wrong key ', () => {
		const cxConfig = getConfig();
		cxConfig.mt.Yandex.key = 'wrongkey';
		const yandex = new Yandex( cxConfig );
		const testSourceContent = '<p>This is a <a href="/Test">test</a></p>';
		fails(
			yandex.translate( 'en', 'gu', testSourceContent ),
			( err ) => {
				if ( ( err instanceof Error ) && /value/.test( err ) ) {
					return true;
				}
			}
		);
	} );
} );
