'use strict';

const preq = require( 'preq' );
const MTClient = require( './MTClient.js' );

class MinT extends MTClient {
	/**
	 * Translate plain text with MinT API
	 * MinT is not capable of HTML translation with all annotation
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
			uri: `${this.conf.mt.MinT.api}/${sourceLang}/${targetLang}`,
			headers: {
				'Content-Type': 'application/json'
			},
			body: JSON.stringify( {
				text: sourceText
			} )
		};

		return preq.post( postData )
			.then( ( response ) => {
				this.metrics.makeMetric( {
					type: 'Counter',
					name: 'translate.MinT.charcount',
					prometheus: {
						name: 'translate_mint_charcount',
						help: 'MinT character count'
					}
				} ).increment( sourceText.length );
				return response.body.translation;
			} )
			.catch( function ( e ) {
				throw new Error( `Translation with MinT ${sourceLang}>${targetLang} failed: ` + e );
			} );
	}
}

module.exports = MinT;
