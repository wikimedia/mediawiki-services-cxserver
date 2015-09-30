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
 * Cheap body extraction.
 *
 * This is safe as we know that the HTML we are receiving from Parsoid is
 * serialized as XML.
 * Restbase does not support body only retrieval of content.
 * See https://phabricator.wikimedia.org/T95199
 * @param {string} html
 * @return {string} body of the html passed, wrapped in <body> tag.
 */
function cheapBodyInnerHTML( html ) {
	var match = /<body[^>]*>([\s\S]*)<\/body>/.exec( html );

	if ( !match ) {
		throw new Error( 'No HTML body found!' );
	} else {
		return '<body>' + match[ 1 ] + '</body>';
	}
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
	var url,
		deferred = Q.defer();

	if ( conf( 'restbase.url' ) ) {
		url = conf( 'restbase.url' )
			.replace( '@lang', this.sourceLanguage )
			.replace( '@title', encodeURIComponent( this.page ) );
	} else {
		url = conf( 'parsoid.api' )
			.replace( '@lang', this.sourceLanguage )
			.replace( '@title', encodeURIComponent( this.page ) );
	}
	request( url,
		function ( error, response, body ) {
			if ( error ) {
				deferred.reject( new Error( error ) );
				return;
			}
			if ( response.statusCode !== 200 ) {
				deferred.reject( new Error( 'Error while fetching page: ' + body ) );
				return;
			}
			deferred.resolve( {
				body: cheapBodyInnerHTML( response.body ),
				// Restbase returns revision ID in etag  header.
				// Example:
				//     ETag: "123456/c4e494da-ee8f-11e4-83a1-8b80de1cde5f"
				revision: response.headers.etag.split( '/' )[ 0 ].replace( '"', '' )
			} );
		}
	);

	return deferred.promise;
};

module.exports.PageLoader = PageLoader;
