'use strict';

const ApiRequest = require( './MwApiRequest' ),
	LinearDoc = require( '../lineardoc' ),
	fs = require( 'fs' ),
	yaml = require( 'js-yaml' ),
	CXSegmenter = require( '../segmentation/CXSegmenter' ),
	MWApiRequestManager = require( './MWApiRequestManager' ),
	Adapter = require( '../Adapter' );

class MWPageLoader extends ApiRequest {
	constructor( config ) {
		super( config );
		this.pageloaderConfig = yaml.load( fs.readFileSync( __dirname + '/../../config/MWPageLoader.yaml' ) );
	}

	/**
	 *
	 * @param {string} page The page title
	 * @param {string} revision The revision id
	 * @param {boolean} wrapSections Whether translatable sections should be wrapped in
	 *   <section> tag
	 * @return {Promise}
	 */
	getPage( page, revision, wrapSections ) {
		return this.fetch( page, revision ).then( ( response ) => {
			let parsedDoc = this.getParsedDoc( response.body );
			if ( wrapSections ) {
				parsedDoc = parsedDoc.wrapSections();
			}
			// Extract category tags from source document.
			const sourceCategoryTags = parsedDoc.categories;
			const segmentedDoc = new CXSegmenter().segment( parsedDoc, this.sourceLanguage );

			if ( this.targetLanguage ) {
				const api = new MWApiRequestManager( this.context, this.context.logger );
				const adapter = new Adapter(
					this.sourceLanguage, this.targetLanguage, api, this.context
				);

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
	 * @param {boolean} wrapSections Whether translatable sections should be wrapped in
	 *   <section> tag
	 * @return {Object}
	 */
	getParsedDoc( content, wrapSections ) {
		const parser = new LinearDoc.Parser( new LinearDoc.MwContextualizer(
			{ removableSections: this.pageloaderConfig.removableSections }
		), {
			wrapSections
		} );
		parser.init();
		parser.write( content );
		return parser.builder.doc;
	}

	parseETag( etag ) {
		// The parsing regex is from
		// https://phabricator.wikimedia.org/rGRES2fa4efb6fcb7cd86a3295a0f513f10ef9dcb2b4d
		const bits = /^(W\/)?"?([^"/]+)(?:\/([^"/]+))"?$/.exec( etag );
		if ( bits ) {
			return {
				weak: bits[ 1 ],
				rev: bits[ 2 ],
				tid: bits[ 3 ]
			};
		}
		return null;
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
				// See https://www.mediawiki.org/wiki/Specs/HTML/2.0.0
				accept: 'text/html; charset=utf-8; profile="https://www.mediawiki.org/wiki/Specs/HTML/2.0.0"'
			}
		};

		return this.restApiGet( domain, path, restReq ).then( ( response ) => {
			return {
				body: response.body,
				// Restbase returns revision ID in ETag header.
				// Example:
				//     ETag: W/"123456/c4e494da-ee8f-11e4-83a1-8b80de1cde5f"
				revision: this.parseETag( response.headers.etag ).rev
			};
		} );
	}

	async adaptCategories( sourceCategoryTags, adapter ) {
		const categories = [];

		for ( let i = 0; i < sourceCategoryTags.length; i++ ) {
			const translationunit = adapter.getAdapter( sourceCategoryTags[ i ] );
			const adaptedCategory = await translationunit.adapt( sourceCategoryTags[ i ] );
			categories.push( JSON.parse( adaptedCategory.attributes[ 'data-cx' ] ) );
		}

		return categories;
	}
}
module.exports = MWPageLoader;
