'use strict';

const MTClient = require( './MTClient.js' );

class TestClient extends MTClient {
	/**
	 * Translate plain text for tests.
	 *
	 * @param {string} sourceLang Source language code
	 * @param {string} targetLang Target language code
	 * @param {string} sourceText Source language text
	 * @return {Promise} Promise of the translated text
	 */
	translateText( sourceLang, targetLang, sourceText ) {
		return Promise.resolve( `[${sourceLang}→${targetLang}]${sourceText}` );
	}
}

module.exports = TestClient;
