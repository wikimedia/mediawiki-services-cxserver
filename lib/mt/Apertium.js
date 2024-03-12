'use strict';

const MTClient = require( './MTClient.js' );
const apertiumLangMapping = require( './Apertium.languagenames.json' );
const { Agent } = require( 'undici' );

class Apertium extends MTClient {
	/**
	 * Translate plain text with Apertium API
	 * Apertium is not capable of HTML translation with all annotation
	 * mapping. For translating HTML, It uses CX's annotation mapping on top
	 * of the plaintext translation. Hence it inherits translateHTML method
	 * of MTClient.
	 *
	 * @param {string} sourceLang Source language code
	 * @param {string} targetLang Target language code
	 * @param {string} sourceText Source language text
	 * @return {Promise} promise: Target language text
	 */
	async translateText( sourceLang, targetLang, sourceText ) {
		const url = this.conf.mt.Apertium.api + '/translate';
		const headers = {
			'Content-Type': 'application/x-www-form-urlencoded'
		};
		const body = {
			markUnknown: 0,
			langpair: `${ apertiumLangMapping[ sourceLang ] }|${ apertiumLangMapping[ targetLang ] }`,
			format: 'txt',
			q: sourceText
		};
		const options = {
			method: 'POST',
			headers: headers,
			body: new URLSearchParams( body ),
			dispatcher: new Agent( { connect: { timeout: 60_000 } } )
		};

		try {
			const response = await fetch( url, options );
			if ( !response.ok ) {
				const responseText = await response.text();
				throw new Error(
					`Network error: HTTP ${ response.status } (${ response.statusText }): ${ responseText }`
				);
			}
			const data = await response.json();
			this.metrics.makeMetric( {
				type: 'Counter',
				name: 'translate.Apertium.charcount',
				prometheus: {
					name: 'translate_apertium_charcount',
					help: 'Apertium character count'
				}
			} ).increment( sourceText.length );
			if ( data?.responseData?.translatedText !== null ) {
				return data.responseData.translatedText;
			} else {
				throw new Error(
					'Processing error. JSON missing responseData.translatedText: ' + JSON.stringify( data )
				);
			}
		} catch ( error ) {
			throw new Error( `Translation with Apertium ${ sourceLang } > ${ targetLang } failed: ${ error.message }` );
		}
	}
}

module.exports = Apertium;
