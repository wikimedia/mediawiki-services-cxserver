'use strict';

const BatchedAPIRequest = require( './BatchedAPIRequest' );

/**
 * Fetches information about titles in batches.
 */
class TitleInfoRequest extends BatchedAPIRequest {
	processResponse( response ) {
		return response.query;
	}

	processPage( page ) {
		return page;
	}

	/**
	 * @param {string[]} titles
	 * @return {Promise}
	 */
	getRequestPromise( titles ) {
		let domain, query;

		query = {
			action: 'query',
			prop: 'info|pageprops|pageimages|pageterms',
			pithumbsize: 80,
			pilimit: titles.length,
			wbptterms: 'description',
			ppprop: 'disambiguation',
			titles: titles.join( '|' ),
			redirects: true,
			'continue': ''
		};
		domain = this.getDomain( this.sourceLanguage );
		// We use POST here because the titles when joined will result in a longer query string
		// that GET requests cannot process sometimes.
		return this.mwPost( domain, query );
	}
}

module.exports = TitleInfoRequest;
