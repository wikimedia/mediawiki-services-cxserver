'use strict';

var preq = require( 'preq' ),
	util = require( 'util' ),
	MTClient = require( './MTClient.js' ),
	apertiumLangMapping = require( './Apertium.languagenames.json' );

function Apertium( options ) {
	this.logger = options.logger;
	this.conf = options.conf;
}

util.inherits( Apertium, MTClient );

/**
 * Translate plain text with Apertium API
 * Apertium is not capable of HTML translation with all annotation
 * mapping. For translating HTML, It use CX's annotation mapping on top
 * of the plaintext translation. Hence it inherits translateHTML method
 * of MTClient.
 *
 * @param {string} sourceLang Source language code
 * @param {string} targetLang Target language code
 * @param {string} sourceText Source language text
 * @return {BBPromise} promise: Target language text
 */
Apertium.prototype.translateText = function ( sourceLang, targetLang, sourceText ) {
	return preq.post( {
		uri: this.conf.mt.apertium.api + '/translate',
		body: {
			markUnknown: 0,
			langpair: apertiumLangMapping[ sourceLang ] + '|' + apertiumLangMapping[ targetLang ],
			format: 'txt',
			q: sourceText
		}
	} ).then( function ( response ) {
		return response.body.responseData.translatedText;
	} );
};

module.exports = Apertium;
