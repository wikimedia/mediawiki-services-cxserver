'use strict';

const ApiRequest = require( './ApiRequest' ),
	LinearDoc = require( '../lineardoc' ),
	cxutil = require( '../util.js' ),
	CXSegmenter = require( '../segmentation/CXSegmenter' ),
	MWApiRequestManager = require( './ApiRequestManager' ),
	Adapter = require( '../Adapter' );

class MWPageLoader extends ApiRequest {

	/**
	 *
	 * @param {string} page The page title
	 * @param {string} revision The revision id
	 * @param {boolean} wrapSections Whether translatable sections should be wrapped in <section> tag
	 * @return {Promise}
	 */
	getPage( page, revision, wrapSections ) {
		return this.fetch( page, revision ).then( ( response ) => {
			const parsedDoc = this.getParsedDoc( response.body, wrapSections );
			// Extract category tags from source document.
			const sourceCategoryTags = parsedDoc.categories;
			const segmentedDoc = new CXSegmenter().segment( parsedDoc, this.sourceLanguage );

			if ( this.targetLanguage ) {
				const api = new MWApiRequestManager( this.context );
				const adapter = new Adapter( this.sourceLanguage, this.targetLanguage, api, this.context );

				return this.adaptCategories( sourceCategoryTags, adapter ).then( ( categories ) => {
					return {
						content: segmentedDoc.getHtml(),
						categories,
						revision: response.revision
					};
				} );
			}

			return {
				content: segmentedDoc.getHtml(),
				revision: response.revision
			};
		} );
	}

	/**
	 *
	 * @param {string} content
	 * @param {boolean} wrapSections Whether translatable sections should be wrapped in <section> tag
	 * @return {Object}
	 */
	getParsedDoc( content, wrapSections ) {
		const parser = new LinearDoc.Parser( new LinearDoc.MwContextualizer(), {
			wrapSections
		} );
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

MWPageLoader.prototype.adaptCategories = cxutil.async( function* ( sourceCategoryTags, adapter ) {
	let categories = [];

	for ( let i = 0; i < sourceCategoryTags.length; i++ ) {
		let translationunit = adapter.getAdapter( sourceCategoryTags[ i ] );
		let adaptedCategory = yield translationunit.adapt( sourceCategoryTags[ i ] );
		categories.push( JSON.parse( adaptedCategory.attributes[ 'data-cx' ] ) );
	}

	return categories;
} );

module.exports = MWPageLoader;
