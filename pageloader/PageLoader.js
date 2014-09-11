/**
 * Loads html for pages to translate
 *
 * @file
 * @copyright See AUTHORS.txt
 * @license GPL-2.0+
 */

'use strict';

var request = require( 'request' ),
	Q = require( 'q' ),
	conf = require( __dirname + '/../utils/Conf.js' );

/**
 * @class ParsoidPageLoader
 *
 * @param {string} page
 * @param {string} sourceLanguage
 * @return {Q.Promise}
 */
function PageLoader( page, sourceLanguage ) {
	this.page = page;
	this.sourceLanguage = sourceLanguage;
}

PageLoader.prototype.load = function () {
	var deferred = Q.defer();

	request(
		conf( 'parsoid.api' ) + '/' + this.sourceLanguage + 'wiki/' + this.page,
		function ( error, response, body ) {
			if ( error ) {
				deferred.reject( new Error( error ) );
				return;
			}
			if ( response.statusCode !== 200 ) {
				deferred.reject( new Error( 'Error while fetching page: ' + body ) );
				return;
			}

			deferred.resolve( body );
		}
	);

	return deferred.promise;
};

/**
 * Gets article revision number from Parsoid html
 * @param {string} html The html returned from Parsoid
 * @return {integer} the revison id
 */
PageLoader.prototype.getRevision = function ( data ) {
	var snippet, revision;

	// Cut down data string to make regex more efficient
	snippet = data.substr( data.indexOf( '<html' ), data.indexOf( '<head' ) );
	revision = snippet.match( /about=".*\/revision\/(.*?)">/ )[ 1 ];

	return parseInt( revision );
};

module.exports.PageLoader = PageLoader;
