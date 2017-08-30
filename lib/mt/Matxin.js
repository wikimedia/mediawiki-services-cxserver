'use strict';

const preq = require( 'preq' ),
	MTClient = require( './MTClient.js' );

/**
 * Matxin machine translation service client.
 * API doc: http://matxin.elhuyar.eus/API_doc
 * Source code: https://github.com/matxin
 */
class Matxin extends MTClient {
	/**
	 * Translate plain text with Matxin API
	 * Matxin is not capable of HTML translation with all annotation mapping.
	 * For translating HTML, It use CX's annotation mapping on top of the plaintext translation.
	 *
	 * @param {string} sourceLang Source language code
	 * @param {string} targetLang Target language code
	 * @param {string} sourceText Source language text
	 * @return {BBPromise} Promise that resolves translated text with line seperator as .॥॥.
	 */
	translateText( sourceLang, targetLang, sourceText ) {
		return preq.post( {
			uri: this.conf.mt.Matxin.api,
			body: {
				direction: sourceLang + '-' + targetLang,
				text: sourceText
			}
		} ).then( ( response ) => response.body.translation.replace( /\. ॥ ॥\. /g, '.॥॥.' ) );
	}
}

module.exports = Matxin;
