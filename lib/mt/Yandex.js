'use strict';

const preq = require( 'preq' );
const MTClient = require( './MTClient.js' );

const yandexLanguageNameMap = {
	'be-tarask': 'be', // T122033
	nb: 'no', // T132217
	simple: 'en', // T196354
	sh: 'bs', // T258919
	wuu: 'zh' // T258919
};

class Yandex extends MTClient {
	/**
	 * Translate marked-up text
	 *
	 * @param {string} sourceLang Source language code
	 * @param {string} targetLang Target language code
	 * @param {string} sourceHtml Source html
	 * @return {Promise} Promise that resolves translated html
	 */
	translate( sourceLang, targetLang, sourceHtml ) {
		return this.translateReducedHtml( sourceLang, targetLang, sourceHtml );
	}

	/**
	 * Translate html or plain text content with Yandex.
	 * Yandex is capable of translating plain text and html with
	 * annotations mapping (keeps markup retained in translated content).
	 * Hence overriding translate method of MTClient.
	 *
	 * @param {string} sourceLang Source language code
	 * @param {string} targetLang Target language code
	 * @param {string} sourceHtml Source language content
	 * @return {Promise} Target language text
	 */
	translateHtml( sourceLang, targetLang, sourceHtml ) {
		const key = this.conf.mt.Yandex.key;
		if ( key === null ) {
			return Promise.reject( new Error( 'Yandex service is misconfigured' ) );
		}

		const length = sourceHtml.length;
		const limit = 10000;
		if ( length > limit ) {
			return Promise.reject( new Error( `Source text too long: ${length} (${limit} is the limit)` ) );
		}

		sourceLang = yandexLanguageNameMap[ sourceLang ] || sourceLang;
		targetLang = yandexLanguageNameMap[ targetLang ] || targetLang;
		const postData = {
			uri: this.conf.mt.Yandex.api + '/api/v1.5/tr.json/translate',
			proxy: this.conf.proxy,
			body: {
				key,
				lang: sourceLang + '-' + targetLang,
				format: 'html',
				text: sourceHtml
			}
		};

		return preq.post( postData )
			.then( ( response ) => {
				this.metrics.makeMetric( {
					type: 'Counter',
					name: 'translate.Yandex.charcount',
					prometheus: {
						name: 'translate_yandex_charcount',
						help: 'Yandex character count'
					}
				} ).increment( length );
				return response.body.text[ 0 ];
			} )
			.catch( ( response ) => {
				throw new Error( `Translation with Yandex failed for ${sourceLang} > ${targetLang} Error: ` +
					this.getErrorName( response.body.code || response.body ) );
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

		return `Unknown error: ${code}`;
	}

	requiresAuthorization() {
		return true;
	}
}

module.exports = Yandex;
