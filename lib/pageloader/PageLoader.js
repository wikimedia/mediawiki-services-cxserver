'use strict';

var apiUtil = require( '../api-util' );

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

function PageLoader( app ) {
	this.app = app;
	this.log = app.logger.log || function () {};
}

/**
 * @param {string} page The page title
 * @param {string} source The language code or the domain of the wiki
 * @param {string} revision The revision id
 * @return {Promise}
 */
PageLoader.prototype.load = function ( page, source, revision ) {
	var path, domain, restReq;

	path = 'page/html/' + encodeURIComponent( page );
	if ( /.+\.org$/.test( source ) ) {
		// We got an actual domain
		domain = source;
	} else {
		// Assume the client means a WP project
		domain = source + '.wikipedia.org';
	}

	if ( revision ) {
		path += '/' + revision;
	}

	restReq = {
		method: 'get',
		headers: {
			// See https://www.mediawiki.org/wiki/Specs/HTML/1.5.0
			accept: 'text/html; charset=utf-8; profile="https://www.mediawiki.org/wiki/Specs/HTML/1.5.0"'
		}
	};

	return apiUtil.restApiGet( this.app, domain, path, restReq ).then( function ( response ) {
		return {
			body: cheapBodyInnerHTML( response.body ),
			// Restbase returns revision ID in etag  header.
			// Example:
			//     ETag: "123456/c4e494da-ee8f-11e4-83a1-8b80de1cde5f"
			revision: response.headers.etag.split( '/' )[ 0 ].replace( '"', '' )
		};
	} );
};

module.exports = PageLoader;
