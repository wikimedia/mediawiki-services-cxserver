'use strict';

const ApiRequest = require( '../mw/ApiRequest' ),
	LinearDoc = require( '../lineardoc' ),
	CXSegmenter = require( '../segmentation/CXSegmenter' );

class MWPageLoader extends ApiRequest {
	getPage( page, revision ) {
		return this.fetch( page, revision ).then( ( response ) => {
			const parsedDoc = this.getParsedDoc( response.body );
			const segmentedDoc = new CXSegmenter().segment( parsedDoc, this.sourceLanguage );
			// TODO: segmentedDoc.wrapSections();
			return {
				content: segmentedDoc.getHtml(),
				revision: response.revision
			};
		} );
	}

	getParsedDoc( content ) {
		const parser = new LinearDoc.Parser( new LinearDoc.MwContextualizer() );
		parser.init();
		parser.write( content );
		return parser.builder.doc;
	}

	/**
	 * @param {string} page The page title
	 * @param {string} revision The revision id
	 * @return {Promise}
	 */
	fetch( page, revision ) {
		let path = 'page/html/' + encodeURIComponent( page );
		const domain = this.getDomain( this.sourceLanguage );

		if ( revision ) {
			path += '/' + encodeURIComponent( revision );
		}

		const restReq = {
			method: 'get',
			headers: {
				// See https://www.mediawiki.org/wiki/Specs/HTML/1.5.0
				accept: 'text/html; charset=utf-8; profile="https://www.mediawiki.org/wiki/Specs/HTML/1.5.0"'
			}
		};

		return this.restApiGet( domain, path, restReq ).then( ( response ) => {
			return {
				body: response.body,
				// Restbase returns revision ID in etag  header.
				// Example:
				//     ETag: "123456/c4e494da-ee8f-11e4-83a1-8b80de1cde5f"
				revision: response.headers.etag.split( '/' )[ 0 ].replace( '"', '' )
			};
		} );
	}
}

module.exports = MWPageLoader;
