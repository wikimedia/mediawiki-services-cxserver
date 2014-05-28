/**
 * Loads html for pages to translate
 *
 * @file
 * @copyright See AUTHORS.txt
 * @license GPL-2.0+
 */

'use strict';

var config,
	request = require( 'request' ),
	Q = require( 'q' );

try {
	config = require( __dirname + '/../config.js' );
} catch ( e ) {
	config = {
		parsoid: {
			api: 'http://parsoid.wmflabs.org'
		}
	};
}

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
		config.parsoid.api + '/' + this.sourceLanguage + 'wiki/' + this.page,
		function ( error, response, body ) {
			if ( error ) {
				deferred.reject( new Error( error ) );
				return;
			}
			if ( response.statusCode !== 200 ) {
				deferred.reject( new Error( 'Error while fetching page: ' + response.statusCode ) );
				return;
			}
			deferred.resolve( body );
		}
	);

	return deferred.promise;
};

module.exports.PageLoader = PageLoader;
