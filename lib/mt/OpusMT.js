'use strict';

const preq = require( 'preq' );
const MTClient = require( './MTClient.js' );

class OpusMT extends MTClient {
	/**
	 * Translate plain text with OpusMT API
	 * OpusMT is not capable of HTML translation with all annotation
	 * mapping. For translating HTML, It uses CX's annotation mapping on top
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
			uri: this.conf.mt.OpusMT.api,
			headers: {
				'Content-Type': 'application/json'
			},
			body: JSON.stringify( {
				from: sourceLang,
				to: targetLang,
				source: sourceText
			} )
		};

		return preq.post( postData )
			.then( ( response ) => {
				this.metrics.makeMetric( {
					type: 'Counter',
					name: 'translate.OpusMT.charcount',
					prometheus: {
						name: 'translate_opusmt_charcount',
						help: 'OpusMT character count'
					}
				} ).increment( sourceText.length );
				return response.body.translation;
			} )
			.catch( function ( e ) {
				throw new Error( `Translation with OpusMT ${sourceLang}>${targetLang} failed: ` + e );
			} );
	}
}

module.exports = OpusMT;
