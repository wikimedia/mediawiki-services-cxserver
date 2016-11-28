'use strict';

var
	util = require( 'util' ),
	preq = require( 'preq' ),
	BBPromise = require( 'bluebird' ),
	MTClient = require( './MTClient.js' ),
	yandexLanguageNameMap;

// Yandex language codes can differ from the language codes that
// we use.
yandexLanguageNameMap = {
	'be-tarask': 'be', // T122033
	nb: 'no' // T132217
};

function Yandex( options ) {
	this.logger = options.logger;
	this.conf = options.conf;
}

util.inherits( Yandex, MTClient );

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
Yandex.prototype.translate = function ( sourceLang, targetLang, sourceText ) {
	var key, postData, self = this;

	key = this.conf.mt.yandex.key;
	if ( key === null ) {
		return BBPromise.reject( new Error( 'Yandex service is misconfigured' ) );
	}

	if ( sourceText.length > 10000 ) {
		return BBPromise.reject( new Error( 'Source text too long ' ) +
			sourceLang + '-' + targetLang );
	}

	sourceLang = yandexLanguageNameMap[ sourceLang ] || sourceLang;
	targetLang = yandexLanguageNameMap[ targetLang ] || targetLang;

	postData = {
		uri: this.conf.mt.yandex.api + '/api/v1.5/tr.json/translate',
		proxy: this.conf.proxy,
		body: {
			key: key,
			lang: sourceLang + '-' + targetLang,
			format: 'html',
			text: sourceText
		}
	};

	return preq.post( postData ).then( function ( response ) {
		return response.body.text[ 0 ];
	} ).catch( function ( response ) {
		throw new Error( 'Translation with Yandex failed. Error: ' +
			self.getErrorName( response.body.code ) + ' ' + sourceLang + '-' + targetLang );
	} );
};

/**
 * Returns error name from error code.
 *
 * @param {number} code Error code
 * @return {string}
 */
Yandex.prototype.getErrorName = function ( code ) {
	// http://api.yandex.com/translate/doc/dg/reference/translate.xml
	var errormap = {
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
};

Yandex.prototype.requiresAuthorization = function () {
	return true;
};

module.exports = Yandex;
