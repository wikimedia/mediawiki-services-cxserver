var
	util = require( 'util' ),
	preq = require( 'preq' ),
	fs = require( 'fs' ),
	BBPromise = require( 'bluebird' ),
	MTClient = require( './MTClient.js' ),
	certificate;

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
	var key, postData;

	key = this.conf.mt.yandex.key;
	if ( key === null ) {
		return BBPromise.reject( new Error( 'Yandex service is misconfigured' ) );
	}

	if ( sourceText.length > 10000 ) {
		return BBPromise.reject( new Error( 'Source text too long' ) );
	}

	// Language mapping that might be needed is be-tarask -> be
	postData = {
		uri: this.conf.mt.yandex.api + '/api/v1.5/tr.json/translate',
		proxy: this.conf.mt.yandex.proxy,
		body: {
			key: key,
			lang: sourceLang + '-' + targetLang,
			format: 'html',
			text: sourceText
		}
	};

	if ( this.conf.mt.yandex.certificate ) {
		certificate = certificate || fs.readFileSync( this.conf.mt.yandex.certificate );
		postData.agentOptions = {
			ca: certificate
		};
	}
	return preq.post( postData ).then( function ( response ) {
		return response.body.text[ 0 ];
	} );

};

/**
 * Returns error name from error code.
 *
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
