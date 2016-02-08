'use strict';

var preq = require( 'preq' );

/**
 * Cheap body extraction.
 *
 * This is safe as we know that the HTML we are receiving from Parsoid is
 * serialized as XML.
 * Restbase does not support body only retrieval of content.
 * See https://phabricator.wikimedia.org/T95199
 *
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
 * @class PageLoader
 *
 */
function PageLoader( options ) {
	this.log = options.logger.log || function () {};
	this.conf = options.conf;
}

/**
 * @param {string} page
 * @param {string} sourceLanguage
 * @param {string} revision
 * @return {Promise}
 */
PageLoader.prototype.load = function ( page, sourceLanguage, revision ) {
	var url;

	url = this.conf.restbase_url
		.replace( '@lang', sourceLanguage )
		.replace( '@title', encodeURIComponent( page ) );

	if ( revision ) {
		url += '/' + revision;
	}

	return preq.get( {
		uri: url,
		headers: {
			'User-Agent': 'cxserver'
		}
	} ).then( function ( response ) {
		return {
			body: cheapBodyInnerHTML( response.body ),
			url: url,
			// Restbase returns revision ID in etag  header.
			// Example:
			//     ETag: "123456/c4e494da-ee8f-11e4-83a1-8b80de1cde5f"
			revision: response.headers.etag.split( '/' )[ 0 ].replace( '"', '' )
		};
	} );
};

module.exports.PageLoader = PageLoader;
