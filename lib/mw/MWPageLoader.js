'use strict';

/**
 * @external MTClient
 */

const ApiRequest = require( './MwApiRequest' ),
	LinearDoc = require( '../lineardoc' ),
	fs = require( 'fs' ),
	yaml = require( 'js-yaml' ),
	CXSegmenter = require( '../segmentation/CXSegmenter' ),
	MWApiRequestManager = require( './MWApiRequestManager' ),
	Adapter = require( '../Adapter' ),
	cxutil = require( '../util' ),
	Title = require( 'mediawiki-title' ).Title;

class MWPageLoader extends ApiRequest {
	constructor( config ) {
		super( config );
		this.pageloaderConfig = yaml.load( fs.readFileSync( __dirname + '/../../config/MWPageLoader.yaml' ) );
	}

	/**
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

				return this.adaptCategories( sourceCategoryTags, adapter ).then( ( categories ) => ( {
					content: segmentedDoc.getHtml(),
					categories,
					revision: response.revision
				} ) );
			}

			return {
				content: segmentedDoc.getHtml(),
				revision: response.revision
			};
		} );
	}

	/**
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

	/**
	 * @param {string} page The page title
	 * @param {string} revision The revision id
	 * @return {Promise}
	 */
	async fetch( page, revision ) {
		let path;
		const domain = this.getDomain( this.sourceLanguage );

		const mwApi = new MWApiRequestManager( this.context, this.context.logger );
		const siteInfo = await mwApi.siteInfoRequest( this.sourceLanguage );

		const titleObject = Title.newFromText( page, siteInfo );
		// Manual normalisation to always transform multi-word page titles to underscore-separated titles
		const title = titleObject.getPrefixedDBKey();

		if ( revision ) {
			path = `/revision/${ revision }/html`;
		} else {
			path = `/page/${ encodeURIComponent( title ) }/html`;
		}

		const restReq = {
			headers: {
				// See https://www.mediawiki.org/wiki/Specs/HTML/2.8.0
				accept: 'text/html; charset=utf-8; profile="https://www.mediawiki.org/wiki/Specs/HTML/2.8.0"'
			}
		};

		return this.restApiGet( domain, path, restReq ).then( async ( response ) => {
			if ( !response.ok ) {
				throw new Error( `GET ${ response.url }: ${ response.status }` );
			}
			return {
				body: await response.text(),
				revision: response.headers.get( 'content-revision-id' )
			};
		} );
	}

	async adaptCategories( sourceCategoryTags, adapter ) {
		const categoryAdaptationRequests = [];

		for ( let i = 0; i < sourceCategoryTags.length; i++ ) {
			const translationunit = adapter.getAdapter( sourceCategoryTags[ i ] );
			const request = translationunit.adapt( sourceCategoryTags[ i ] ).then( ( adaptedCategory ) => JSON.parse( adaptedCategory.attributes[ 'data-cx' ] ) );
			categoryAdaptationRequests.push( request );
		}

		return await Promise.all( categoryAdaptationRequests );
	}

	/**
	 * Given a source title and an MTClient instance, this method returns a promise resolving
	 * to an object that contains the source language,the target language, the source title and
	 * the suggested target title. The suggested title is fetched from Wikidata API, if it exists
	 * for the given target language. If not, the source title is translated using the given MTClient
	 * for that language pair, and this translation is returned as suggested target title.
	 * Finally, if the translation fails too, the source title is returned as suggested target title.
	 *
	 * @param {string} sourceTitle
	 * @param {MTClient} mtClient
	 * @return {Promise<{sourceLanguage: string, targetLanguage: string, sourceTitle: string, targetTitle: string}|null>}
	 */
	async fetchTargetTitle( sourceTitle, mtClient ) {
		const api = new MWApiRequestManager( this.context, this.context.logger );

		const sourceTitleInfo = await api.titleInfoRequest( sourceTitle, this.sourceLanguage );
		const qid = cxutil.getProp( [ 'pageprops', 'wikibase_item' ], sourceTitleInfo );

		if ( !qid ) {
			return null;
		}
		const wikidataLabel = await api.wikidataRequest( qid, this.targetLanguage );
		const result = {
			sourceLanguage: this.sourceLanguage,
			targetLanguage: this.targetLanguage,
			sourceTitle,
			targetTitle: sourceTitle
		};

		if ( wikidataLabel ) {
			result.targetTitle = wikidataLabel;
		} else if ( sourceTitle ) {
			const translatedLabel = await mtClient.translate(
				this.sourceLanguage,
				this.targetLanguage,
				sourceTitle,
				'text'
			);

			if ( translatedLabel ) {
				result.targetTitle = translatedLabel;
			}
		}

		return result;
	}

}
module.exports = MWPageLoader;
