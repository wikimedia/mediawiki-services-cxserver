var Q = require( 'q' ),
	request = require( 'request' ),
	util = require( 'util' ),
	MTClient  = require( './MTClient.js' ),
	conf = require( __dirname + '/../utils/Conf.js' );

function Yandex() {

}

util.inherits( Yandex, MTClient );

/**
 * Translate plain text with Yandex.
 *
 * @param {string} sourceLang Source language code
 * @param {string} targetLang Target language code
 * @param {string} sourceText Source language text
 * @return {Q.Promise} Target language text
 */
Yandex.prototype.translate = function ( sourceLang, targetLang, sourceText ) {
	var key, postData,
		self = this,
		deferred = Q.defer();

	key = conf( 'mt.yandex.key' );
	if ( key === null ) {
		deferred.reject( new Error( 'Yandex service is misconfigured' ) );
		return deferred.promise;
	}

	if ( sourceText.length > 10000 ) {
		deferred.reject( new Error( 'Source text too long' ) );
		return deferred.promise;
	}

	// Language mapping that might be needed is be-tarask -> be
	postData = {
		url: conf( 'mt.yandex.api' ) + '/api/v1.5/tr.json/translate',
		form: {
			key: key,
			lang: sourceLang + '-' + targetLang,
			format: 'html',
			text: sourceText
		}
	};

	request.post( postData, function ( error, response, body ) {
		var ret;

		if ( error ) {
			deferred.reject( new Error( error ) );
			return;
		}

		try {
			ret = JSON.parse( body );
		} catch ( err ) {
			deferred.reject( err );
			return;
		}

		console.log( ret );
		if ( ret.code !== 200 ) {
			deferred.reject( new Error( ret.code + ': ' + self.getErrorName( ret.code ) ) );
		}

		deferred.resolve( ret.text[ 0 ] );
	} );

	return deferred.promise;
};

/**
 * Returns error name from error code.
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

module.exports = Yandex;
