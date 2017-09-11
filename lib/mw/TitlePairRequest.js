'use strict';

/**
 * ContentTranslation Title pair request
 *
 */
const BatchedAPIRequest = require( './BatchedAPIRequest' );

/**
 * Fetches information about title pairs in batches.
 *
 * @class
 * @extends BatchedAPIRequest
 * @constructor
 * @param {Object} config Configuration
 */
class TitlePairRequest extends BatchedAPIRequest {
	processResponse( response ) {
		return response.query;
	}

	processPage( page ) {
		return {
			sourceTitle: page.title,
			targetTitle: page.langlinks && page.langlinks[ 0 ] && page.langlinks[ 0 ][ '*' ],
			missing: page.langlinks && page.langlinks[ 0 ] && page.langlinks[ 0 ][ '*' ] === undefined
		};
	}

	getRequestPromise( subqueue ) {
		var domain, query;
		query = {
			action: 'query',
			prop: 'langlinks',
			lllimit: subqueue.length,
			lllang: this.getSiteCode( this.targetLanguage ),
			titles: subqueue.join( '|' ),
			redirects: true,
			'continue': ''
		};
		domain = this.getDomain( this.sourceLanguage );
		// We use POST here because the titles when joined will result in a longer query string
		// that GET requests cannot process sometimes.
		return this.mwPost( domain, query );
	}
}

module.exports = TitlePairRequest;
