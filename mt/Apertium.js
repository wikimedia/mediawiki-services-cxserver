var Q = require( 'q' ),
	util = require( 'util' ),
	request = require( 'request' ),
	conf = require( __dirname + '/../utils/Conf.js' ),
	MTClient = require( './MTClient.js' ),
	apertiumLangMapping = require( './Apertium.languagenames.json' );

function Apertium() {

}

util.inherits( Apertium, MTClient );

/**
 * Translate plain text with Apertium API
 * Apertium is not capable of HTML translation with all annotation
 * mapping. For translating HTML, It use CX's annotation mapping on top
 * of the plaintext translation. Hence it inherits translateHTML method
 * of MTClient.
 * @param {string} sourceLang Source language code
 * @param {string} targetLang Target language code
 * @param {string} sourceText Source language text
 * @return {Object} Deferred promise: Target language text
 */
Apertium.prototype.translateText = function ( sourceLang, targetLang, sourceText ) {
	var deferred = Q.defer(),
		postData;

	postData = {
		url: conf( 'mt.apertium.api' ) + '/translate',
		form: {
			markUnknown: 0,
			langpair: apertiumLangMapping[ sourceLang ] + '|' + apertiumLangMapping[ targetLang ],
			format: 'txt',
			q: sourceText
		}
	};
	request.post( postData,
		function ( error, response, body ) {
			var message;

			if ( error ) {
				deferred.reject( new Error( error ) );
				return;
			}
			if ( response.statusCode !== 200 ) {
				message = 'Error ' + response.statusCode;
				message += ' sourceText={' + sourceText + '}, body={' + body + '}';
				deferred.reject( new Error( message ) );
				return;
			}
			deferred.resolve( JSON.parse( body ).responseData.translatedText );
		}
	);
	return deferred.promise;
};

module.exports = Apertium;
