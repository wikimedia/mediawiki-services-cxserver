'use strict';

const cxutil = require( '../util' );
const MwApiRequest = require( '../mw/MwApiRequest' );

/**
 * @external MWApiRequestManager
 */

/**
 * SourceSuggester: Suggest a source article to use for creating given
 * article in given target language using translation
 *
 * @class
 */
class SourceSuggester {
	/**
	 * @param {string} targetLanguage
	 * @param {string} targetTitle
	 * @param {Object} config
	 * @param {string[]} config.sourceLanguages Array of possible source languages
	 * @param {MWApiRequestManager} config.api The api manager instance
	 * @param {Object} config.context The application context
	 * @param {Function} config.mtProviderFactory A function that returns a valid MTClient
	 *   instance
	 */
	constructor( targetLanguage, targetTitle, config ) {
		this.targetLanguage = targetLanguage;
		this.targetTitle = targetTitle;
		this.sourceLanguages = config.sourceLanguages || [];
		if ( targetLanguage !== 'en' && !this.sourceLanguages.includes( 'en' ) ) {
			this.sourceLanguages.push( 'en' );
		}
		this.api = config.api;
		this.context = config.context;
		this.logger = this.context.logger;
		this.mtProviderFactory = config.mtProviderFactory;
	}

	/**
	 * Suggest possible source articles for the given target language and title
	 *
	 * @return {Object[]} Array of candidate source language information objects
	 */
	async suggest() {
		if ( !this.sourceLanguages || !this.sourceLanguages.length ) {
			// Nothing to do.
			return [];
		}

		let suggestions = [];
		// Try the source title as target title
		suggestions = suggestions.concat( await this.suggestUsingTitle( () => this.targetTitle ) );

		if ( suggestions.length ) {
			// Return unique set of suggestion objects
			return [ ...new Set( suggestions ) ];
		}

		// Failed to find a candidate using the target title.
		// Try Wikidata label corresponding to the title in candidate languages
		const wikidataId = await this.getWikidataQid( this.targetLanguage, this.targetTitle );
		if ( wikidataId ) {
			const wikidataSuggestion = await this.suggestUsingWikidata( wikidataId );
			if ( wikidataSuggestion ) {
				suggestions.push( wikidataSuggestion );
			}
		} else {
			this.logger.log( 'debug', `No Wikidata ID for ${ this.targetTitle } in ${ this.targetLanguage }` );
		}

		if ( suggestions.length ) {
			// Return unique set of suggestion objects
			return [ ...new Set( suggestions ) ];
		}

		// Try machine translating given target language to source language
		return await this.suggestUsingTitle( this.getMachineTranslatedTitle.bind( this ) );
	}

	/**
	 * Suggest a title by searching in Wikidata
	 *
	 * @param {string} wikidataId QID
	 * @return {Object}
	 */
	async suggestUsingWikidata( wikidataId ) {
		this.logger.log( 'debug', `Wikidata id for ${ this.targetTitle } in ${ this.targetLanguage } is ${ wikidataId }` );
		const candidateTitles = await this.getWikidataLabels( wikidataId, this.sourceLanguages );
		for ( let i = 0; i < candidateTitles.length; i++ ) {
			const title = candidateTitles[ i ].title;
			const language = candidateTitles[ i ].language;
			this.logger.log( 'debug', `Attempting ${ title } in ${ language }` );
			const suggestion = await this.api.titleInfoRequest( title, language );
			if ( suggestion && suggestion.pageid ) {
				suggestion.language = language;
				return suggestion;
			}
		}
	}

	/**
	 * Suggest source article based on a title generator in a set of source language candidates
	 *
	 * @param {Function} titleGenerator A function that returns a title for given source language
	 * @return {Object[]} Array of candidate source language information objects
	 * @memberof SourceSuggester
	 */
	async suggestUsingTitle( titleGenerator ) {
		const suggestions = await Promise.all(
			this.sourceLanguages.map( async ( language ) => {
				const title = await titleGenerator( language, this.targetTitle );
				if ( title ) {
					this.logger.log( 'debug', `Attempting ${ title } in ${ language }` );
					const suggestion = await this.api.titleInfoRequest( title, language );
					if ( suggestion && suggestion.pageid ) {
						suggestion.language = language;
						return suggestion;
					}
				}
			} )
		);
		return suggestions.filter( ( suggestion ) => suggestion );
	}

	/**
	 * Search for the title in a given language in Wikidata
	 *
	 * @param {string} language
	 * @param {string} title
	 * @return {string} Wikidata QID.
	 */
	async getWikidataQid( language, title ) {
		const api = new MwApiRequest( { context: this.context } );
		const searchResult = await api.mwGet(
			'www.wikidata.org',
			{
				action: 'wbsearchentities',
				search: title,
				language: language,
				format: 'json'
			} );
		return cxutil.getProp( [ 'search', 0, 'id' ], searchResult );
	}

	/**
	 * Get the Wikidata labels for the given QID
	 * Note that we are not using WikidataRequest class here because that takes
	 * only one language at a time. Also, we are not considering redirects.
	 *
	 * @param {string} wikidataId
	 * @param {string[]} languages
	 * @return {string} Wikidata QID.
	 */
	async getWikidataLabels( wikidataId, languages ) {
		const results = [];
		const api = new MwApiRequest( { context: this.context } );
		const searchResult = await api.mwGet(
			'www.wikidata.org',
			{
				action: 'wbgetentities',
				props: 'labels',
				ids: wikidataId,
				languages: languages.join( '|' )
			} );
		const labels = cxutil.getProp( [ 'entities', wikidataId, 'labels' ], searchResult );
		if ( labels ) {
			Object.keys( labels ).forEach( ( language ) => {
				results.push( {
					language: language,
					title: labels[ language ].value
				} );
			} );
		}

		return results;
	}

	/**
	 * Get the machine translated title
	 *
	 * @param {string} language
	 * @param {string} title
	 * @return {string} The machine translated title
	 */
	async getMachineTranslatedTitle( language, title ) {
		const mtClient = this.mtProviderFactory( this.targetLanguage, language );
		if ( mtClient ) {
			const machineTranslatedTitle = await mtClient.translate(
				this.targetLanguage, language, title, 'text'
			);
			this.logger.log( 'debug',
				`Machine translated title for "${ title } "in ${ language } is "${ machineTranslatedTitle }"` );
			return machineTranslatedTitle.trim();
		} else {
			this.logger.log( 'debug', `No Machine translation engine for "${ this.targetLanguage } -> ${ language }"` );
		}
	}
}

module.exports = SourceSuggester;
