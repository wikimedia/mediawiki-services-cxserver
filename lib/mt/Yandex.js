'use strict';

const LinearDoc = require( './../lineardoc' );
const preq = require( 'preq' );
const MTClient = require( './MTClient.js' );

const yandexLanguageNameMap = {
	'be-tarask': 'be', // T122033
	nb: 'no', // T132217
	simple: 'en' // T196354
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
		this.buildSourceDoc( sourceHtml );
		const { reducedDoc, attrDump } = this.sourceDoc.reduce();

		return this.translateHtml(
			sourceLang, targetLang, reducedDoc.getHtml()
		).then( ( translatedHTML ) => {
			const parser = new LinearDoc.Parser( new LinearDoc.MwContextualizer() );
			parser.init();
			parser.write( translatedHTML );
			const translatedDoc = parser.builder.doc;
			const targetDoc = translatedDoc.expand( attrDump );
			// Return sanitized HTML output
			const sanitizedResult = this.sanitize( targetDoc.getHtml() );
			return sanitizedResult;
		} );
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
	 * @return {Q.Promise} Target language text
	 */
	translateHtml( sourceLang, targetLang, sourceHtml ) {
		var key, postData;

		key = this.conf.mt.Yandex.key;
		if ( key === null ) {
			return Promise.reject( new Error( 'Yandex service is misconfigured' ) );
		}
		if ( sourceHtml.length > 10000 ) {
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
				text: sourceHtml
			}
		};

		return preq.post( postData )
			.then( ( response ) => response.body.text[ 0 ] )
			.catch( ( response ) => {
				throw new Error( 'Translation with Yandex failed. Error: ' +
					this.getErrorName( response.body.code || response.body ) +
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
