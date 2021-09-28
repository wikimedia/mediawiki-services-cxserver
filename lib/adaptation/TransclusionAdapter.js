'use strict';

/**
 * @external MWApiRequestManager
 */

const TransclusionFactory = require( './TransclusionFactory' );

/**
 * This class adapts the single and multi-part transclusions, i.e. data-mw.parts by
 * figuring out a suitable adapter for each type.
 */
class TransclusionAdapter {
	/**
	 * @param {Object} parts data-mw.parts
	 * @param {MWApiRequestManager} api
	 * @param {string} sourceLanguage The source language identifying the source wiki.
	 * @param {string} targetLanguage The target language identifying the target wiki of adaptation.
	 * @param {Object} options
	 */
	constructor( parts, api, sourceLanguage, targetLanguage, options ) {
		this.sourceLanguage = sourceLanguage;
		this.targetLanguage = targetLanguage;

		const factory = new TransclusionFactory( api, sourceLanguage, targetLanguage, options );
		this.transclusions = parts.map( ( part ) => factory.create( part ) );
	}

	/**
	 * Adapt all the parts asynchronously
	 *
	 * @return {Promise}
	 */
	async process() {
		const adaptedresults = await Promise.all( this.transclusions.map( async ( t ) => await t.adapt() ) );
		return {
			getParsoidData: () => adaptedresults.map( ( t ) => t.formatForParsoid() ),
			getCXServerData: () => adaptedresults.map( ( t ) => t.getMetadata() )
		};
	}
}

module.exports = TransclusionAdapter;
