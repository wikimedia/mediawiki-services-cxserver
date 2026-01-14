/**
 * ContentTranslation Title pair request
 *
 */
import BatchedAPIRequest from './BatchedAPIRequest.js';

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
		const missing = !page.langlinks?.[ 0 ] || page.langlinks[ 0 ][ '*' ] === undefined;

		return {
			sourceTitle: page.title,
			targetTitle: page.langlinks && page.langlinks[ 0 ] && page.langlinks[ 0 ][ '*' ],
			missing
		};
	}

	getRequestPromise( subqueue ) {
		const query = {
			action: 'query',
			prop: 'langlinks',
			lllimit: subqueue.length,
			lllang: this.getLllangParam( this.targetLanguage ),
			titles: subqueue.join( '|' ),
			redirects: true,
			continue: ''
		};
		const domain = this.getDomain( this.sourceLanguage );

		return this.mwPost( domain, query );
	}
}

export default TitlePairRequest;
