'use strict';

const ApiRequest = require( '../mw/ApiRequest' ),
	CXSegmenter = require( '../segmentation/CXSegmenter' );

class MWPageLoader extends ApiRequest {
	getPage( page, revision ) {
		return this.fetch( page, revision ).then( ( response ) => {
			let segmentedDoc = this.segment( response.body );
			// TODO: segmentedDoc.wrapSections();
			return {
				content: segmentedDoc.getHtml(),
				revision: response.revision
			};
		} );
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

	segment( pageContent ) {
		const segmenter = new CXSegmenter( pageContent, this.sourceLanguage );
		segmenter.segment();
		return segmenter.getSegmentedDoc();
	}

}

module.exports = MWPageLoader;
