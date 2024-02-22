'use strict';

const cxutil = require( '../util.js' );
const extend = require( 'extend' );
const BatchedAPIRequest = require( './BatchedAPIRequest' );

/**
 * Fetches information about Wikidata entities.
 */
class WikidataRequest extends BatchedAPIRequest {
	constructor( config ) {
		super( {
			context: config.context,
			sourceLanguage: 'mul',
			targetLanguage: config.language
		} );
	}

	processResponse( response ) {
		const processedResponse = {
			pages: [],
			redirects: []
		};

		// BatchedAPIRequest expects title attribute for each page
		for ( const key in response.entities ) {
			if ( response.entities[ key ].redirects ) {
				extend( processedResponse.redirects, response.entities[ key ].redirects );
				delete response.entities[ key ].redirects;
			}

			processedResponse.pages[ key ] = response.entities[ key ];
			processedResponse.pages[ key ].title = key;
		}

		return processedResponse;
	}

	processPage( page ) {
		return cxutil.getProp( [ 'labels', this.targetLanguage, 'value' ], page );
	}

	/**
	 * @param {string[]} titles
	 * @return {Promise}
	 */
	getRequestPromise( titles ) {
		const query = {
			action: 'wbgetentities',
			props: 'labels',
			ids: titles.join( '|' ),
			languages: this.targetLanguage,
			redirects: 'yes'
		};

		return this.mwGet( 'www.wikidata.org', query );
	}
}

module.exports = WikidataRequest;
