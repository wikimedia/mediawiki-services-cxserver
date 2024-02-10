'use strict';

const MTClient = require( './MTClient.js' );
const cxUtil = require( '../util.js' );

class TestClient extends MTClient {
	/**
	 * Translate the given content between the language pairs.
	 *
	 * @param {string} sourceLang Source language code
	 * @param {string} targetLang Target language code
	 * @param {string} content Content to translate
	 * @param {string} [format="html"] Format of the content- html or text
	 * @return {Object} Deferred promise: Target language text
	 */
	translate( sourceLang, targetLang, content, format ) {
		if ( format === 'text' || cxUtil.isPlainText( content ) ) {
			return this.translateText( sourceLang, targetLang, content );
		} else if ( this.conf.reduce ) {
			// translate like Google or Apertium, but with dummy API results.
			return this.translateReducedHtml( sourceLang, targetLang, content );
		} else {
			// Use the text translation and lineardoc based markup restoring.
			return super.translateHtml( sourceLang, targetLang, content );
		}
	}

	/**
	 * Translate plain text for tests.
	 *
	 * @param {string} sourceLang Source language code
	 * @param {string} targetLang Target language code
	 * @param {string} sourceText Source language text
	 * @return {Promise} Promise of the translated text
	 */
	translateText( sourceLang, targetLang, sourceText ) {
		if ( !sourceText ) {
			throw new Error( 'sourceText not provided' );
		}
		// Return dummy translation.
		return Promise.resolve( `[${ sourceLang }→${ targetLang }]${ sourceText }` );
	}

	/**
	 * Translate html content.
	 *
	 * @param {string} sourceLang Source language code
	 * @param {string} targetLang Target language code
	 * @param {string} sourceHtml Source language content
	 * @return {Promise} Target language text
	 */
	translateHtml( sourceLang, targetLang, sourceHtml ) {
		return Promise.resolve( sourceHtml.toUpperCase() );
	}
}

module.exports = TestClient;
