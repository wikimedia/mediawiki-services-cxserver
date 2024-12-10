import { getProp } from '../util.js';
import BatchedAPIRequest from './BatchedAPIRequest.js';

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
				Object.assign( processedResponse.redirects, response.entities[ key ].redirects );
				delete response.entities[ key ].redirects;
			}

			processedResponse.pages[ key ] = response.entities[ key ];
			processedResponse.pages[ key ].title = key;
		}

		return processedResponse;
	}

	processPage( page ) {
		return getProp( [ 'labels', this.targetLanguage, 'value' ], page );
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

export default WikidataRequest;
