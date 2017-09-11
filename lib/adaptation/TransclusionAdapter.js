'use strict';

const BBPromise = require( 'bluebird' );
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
	 */
	constructor( parts, api, sourceLanguage, targetLanguage ) {
		this.sourceLanguage = sourceLanguage;
		this.targetLanguage = targetLanguage;

		const factory = new TransclusionFactory( api, sourceLanguage, targetLanguage );
		this.transclusions = parts.map( ( part ) => factory.create( part ) );
	}

	/**
	 * Adapt all the parts asynchronously
	 * @return {Promise}
	 */
	process() {
		const promises = this.transclusions.map( ( t ) => t.adapt() );
		return BBPromise.map( promises, ( res ) => res ).then( ( adapted ) =>
			( {
				getParsoidData: () => adapted.map( ( t ) => t.formatForParsoid() ),
				getCXServerData: () => adapted.map( ( t ) => t.getMetadata() )
			} )
		);
	}
}

module.exports = TransclusionAdapter;
