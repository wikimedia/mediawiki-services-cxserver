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
		const query = {
			action: 'query',
			prop: 'langlinks',
			lllimit: subqueue.length,
			lllang: this.getSiteCode( this.targetLanguage ),
			titles: subqueue.join( '|' ),
			redirects: true,
			continue: ''
		};
		const domain = this.getDomain( this.sourceLanguage );

		return this.mwGet( domain, query );
	}
}

module.exports = TitlePairRequest;
