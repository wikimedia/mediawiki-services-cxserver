'use strict';

const preq = require( 'preq' ),
	MTClient = require( './MTClient.js' ),
	yandexLanguageNameMap = {
		'be-tarask': 'be', // T122033
		nb: 'no' // T132217
	};

class Yandex extends MTClient {

	/**
	 * Translate html or plain text content with Yandex.
	 * Yandex is capable of translating plain text and html with
	 * annotations mapping (keeps markup retained in translated content).
	 * Hence overriding translate method of MTClient.
	 *
	 * @param {string} sourceLang Source language code
	 * @param {string} targetLang Target language code
	 * @param {string} sourceText Source language text
	 * @return {Q.Promise} Target language text
	 */
	translate( sourceLang, targetLang, sourceText ) {
		var key, postData;

		key = this.conf.mt.Yandex.key;
		if ( key === null ) {
			return Promise.reject( new Error( 'Yandex service is misconfigured' ) );
		}

		if ( sourceText.length > 10000 ) {
			return Promise.reject( new Error( 'Source text too long: ' +
				sourceLang + '-' + targetLang ) );
		}

		sourceLang = yandexLanguageNameMap[ sourceLang ] || sourceLang;
		targetLang = yandexLanguageNameMap[ targetLang ] || targetLang;

		postData = {
			uri: this.conf.mt.Yandex.api + '/api/v1.5/tr.json/translate',
			proxy: this.conf.proxy,
			body: {
				key,
				lang: sourceLang + '-' + targetLang,
				format: 'html',
				text: sourceText
			}
		};

		return preq.post( postData )
			.then( ( response ) => response.body.text[ 0 ] )
			.catch( ( response ) => {
				throw new Error( 'Translation with Yandex failed. Error: ' +
					this.getErrorName( response.body.code ) + ' ' + sourceLang + '-' + targetLang );
			} );
	}

	/**
	 * Returns error name from error code.
	 *
	 * @param {number} code Error code
	 * @return {string}
	 */
	getErrorName( code ) {
		// http://api.yandex.com/translate/doc/dg/reference/translate.xml
		const errormap = {
			200: 'ERR_OK',
			401: 'ERR_KEY_INVALID',
			402: 'ERR_KEY_BLOCKED',
			403: 'ERR_DAILY_REQ_LIMIT_EXCEEDED',
			404: 'ERR_DAILY_CHAR_LIMIT_EXCEEDED',
			413: 'ERR_TEXT_TOO_LONG',
			422: 'ERR_UNPROCESSABLE_TEXT',
			501: 'ERR_LANG_NOT_SUPPORTED'
		};

		if ( code in errormap ) {
			return errormap[ code ];
		}

		return 'Unknown error';
	}

	requiresAuthorization() {
		return true;
	}
}

module.exports = Yandex;
