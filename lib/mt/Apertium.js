'use strict';

const preq = require( 'preq' ),
	MTClient = require( './MTClient.js' ),
	apertiumLangMapping = require( './Apertium.languagenames.json' );

class Apertium extends MTClient {
	/**
	 * Translate plain text with Apertium API
	 * Apertium is not capable of HTML translation with all annotation
	 * mapping. For translating HTML, It use CX's annotation mapping on top
	 * of the plaintext translation. Hence it inherits translateHTML method
	 * of MTClient.
	 *
	 * @param {string} sourceLang Source language code
	 * @param {string} targetLang Target language code
	 * @param {string} sourceText Source language text
	 * @return {Promise} promise: Target language text
	 */
	translateText( sourceLang, targetLang, sourceText ) {
		const postData = {
			uri: this.conf.mt.Apertium.api + '/translate',
			body: {
				markUnknown: 0,
				langpair: apertiumLangMapping[ sourceLang ] + '|' + apertiumLangMapping[ targetLang ],
				format: 'txt',
				q: sourceText
			}
		};

		return preq.post( postData )
			.then( ( response ) => {
				this.metrics.makeMetric( {
					type: 'Counter',
					name: 'translate.Apertium.charcount',
					prometheus: {
						name: 'translate_apertium_charcount',
						help: 'Apertium character count'
					}
				} ).increment( sourceText.length );
				return response.body.responseData.translatedText;
			} )
			.catch( function ( e ) {
				throw new Error( `Translation with Apertium ${sourceLang}>${targetLang} failed: ` + e );
			} );
	}
}

module.exports = Apertium;
