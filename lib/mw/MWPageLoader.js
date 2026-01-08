/**
 * @external MTClient
 */

import { readFileSync } from 'fs';
import { load } from 'js-yaml';
import { Title } from 'mediawiki-title';
import { MwContextualizer, Parser } from '../lineardoc/index.js';
import CXSegmenter from '../segmentation/CXSegmenter.js';
import Adapter from '../Adapter.js';
import { getProp, HTTPError } from '../util.js';
import MWApiRequestManager from './MWApiRequestManager.js';
import ApiRequest from './MwApiRequest.js';

const dirname = new URL( '.', import.meta.url ).pathname;
class MWPageLoader extends ApiRequest {
	constructor( config ) {
		super( config );
		this.pageloaderConfig = load( readFileSync( dirname + '/../../config/MWPageLoader.yaml' ) );
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
		const parser = new Parser( new MwContextualizer(
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

		return this.restApiGet( domain, path, restReq ).then( async ( { statusCode, headers, body } ) => {
			if ( statusCode !== 200 ) {
			// there was an error when calling the upstream service, propagate that
				throw new HTTPError( {
					status: statusCode,
					type: 'api_error',
					detail: `Error while fetching page ${ this.sourceLanguage }:${ title }`
				} );
			}
			return {
				body: await body.text(),
				revision: headers[ 'content-revision-id' ]
			};
		} );
	}

	async adaptCategories( sourceCategoryTags, adapter ) {
		const categoryAdaptationRequests = [];

		// Deduplicate sourceCategoryTags based on their href
		sourceCategoryTags = [
			...new Map(
				sourceCategoryTags.map( ( tag ) => [ tag.attributes.href, tag ] )
			).values()
		];

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
	 * @param {string} sourceTitle Source wiki page title (in `this.sourceLanguage`).
	 * @param {MTClient} mtClient Machine translation client used as a fallback when Wikidata does not provide a label/title in `this.targetLanguage`.
	 * @return {Promise<{sourceLanguage: string, targetLanguage: string, sourceTitle: string, targetTitle: string}|null>}
	 */
	async fetchTargetTitle( sourceTitle, mtClient ) {
		const api = new MWApiRequestManager( this.context, this.context.logger );

		// First attempt: check whether there is already an existing target-language page title for this source title
		const targetInfo = await api.titlePairRequest( sourceTitle, this.sourceLanguage, this.targetLanguage );

		// If the target page exists, return it immediately.
		// This is the best result because it points to a real existing page title.
		if ( targetInfo && !targetInfo.missing ) {
			return {
				sourceLanguage: this.sourceLanguage,
				targetLanguage: this.targetLanguage,
				sourceTitle,
				targetTitle: targetInfo.targetTitle
			};
		}

		// Fetch info about the source title in the source wiki,
		// primarily to extract its associated Wikidata item id (QID) from pageprops.
		const sourceTitleInfo = await api.titleInfoRequest( sourceTitle, this.sourceLanguage );

		// Extract the Wikidata QID
		const qid = getProp( [ 'pageprops', 'wikibase_item' ], sourceTitleInfo );

		// If there is no QID, the title is not connected to Wikidata, so no cross-language
		// lookup/label suggestion can be made. Return null.
		if ( !qid ) {
			return null;
		}

		// Ask Wikidata for the label in the target language.
		// If present, this is usually a better “natural” title suggestion than MT.
		const wikidataLabel = await api.wikidataRequest( qid, this.targetLanguage );

		// Initialize the result with a conservative default: fall back to the original sourceTitle.
		const result = {
			sourceLanguage: this.sourceLanguage,
			targetLanguage: this.targetLanguage,
			sourceTitle,
			targetTitle: sourceTitle
		};

		// Preferred: Use Wikidata label when available for the target language.
		if ( wikidataLabel ) {
			result.targetTitle = wikidataLabel;
		} else {
			// Fallback: If Wikidata does not provide a label, try machine translation of the title.
			const translatedLabel = await mtClient.translate(
				this.sourceLanguage,
				this.targetLanguage,
				sourceTitle,
				'text'
			);

			// If MT succeeded, use the translated title as the suggestion.
			if ( translatedLabel ) {
				result.targetTitle = translatedLabel;
			}
		}

		// Return the chosen suggestion (existing target title > Wikidata label > MT translation > sourceTitle).
		return result;
	}

}
export default MWPageLoader;
