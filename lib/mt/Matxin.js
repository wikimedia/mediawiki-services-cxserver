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
	 * @return {Promise} Promise that resolves translated text with line seperator as .॥॥.
	 */
	translateText( sourceLang, targetLang, sourceText ) {
		const key = this.conf.mt.Matxin.key;
		if ( key === null ) {
			return Promise.reject( new Error( 'Matxin service is misconfigured' ) );
		}

		const length = sourceText.length;
		const limit = 10000;
		if ( length > limit ) {
			return Promise.reject( new Error( `Source text too long: ${length} (${limit} is the limit)` ) );
		}

		const postData = {
			uri: this.conf.mt.Matxin.api,
			body: {
				key: this.conf.mt.Matxin.key,
				direction: sourceLang + '-' + targetLang,
				text: sourceText
			}
		};

		return preq.post( postData )
			.then( ( response ) => {
				this.metrics.increment( 'translate.Matxin.charcount', length );
				return response.body.translation.replace( /\. ॥ ॥\./g, '.॥॥.' );
			} )
			.catch( ( response ) => {
				throw new Error( 'Translation with Matxin failed. Error: ' +
					this.getErrorName( response.status ) +
						` for ${sourceLang} > ${targetLang}` );
			} );
	}

	/**
	 * Returns error name from error code.
	 *
	 * @param {number} code Error code
	 * @return {string}
	 */
	getErrorName( code ) {
		const errormap = {
			403: 'Invalid api key'
		};

		if ( code in errormap ) {
			return errormap[ code ];
		}

		return `Unknown error: ${code}`;
	}

	requiresAuthorization() {
		return true;
	}
}

module.exports = Matxin;
