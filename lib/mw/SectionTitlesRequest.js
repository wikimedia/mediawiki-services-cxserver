/**
 * ContentTranslation Section Titles request
 *
 */
import { extractSections } from '../section-extractor.js';
import BatchedAPIRequest from './BatchedAPIRequest.js';

/**
 * Fetches information about title pairs in batches.
 *
 * @class
 * @extends BatchedAPIRequest
 * @constructor
 * @param {Object} config Configuration
 */
class SectionTitlesRequest extends BatchedAPIRequest {
	processResponse( response ) {
		return response.query;
	}

	processPage( page ) {
		const content = page.revisions?.[ 0 ]?.slots?.main?.content;
		return content && extractSections( content ) || [];
	}

	getRequestPromise( subqueue ) {
		const query = {
			action: 'query',
			prop: 'revisions',
			rvprop: 'content',
			rvslots: 'main',
			format: 'json',
			formatversion: '2',
			titles: subqueue.join( '|' ),
			redirects: true,
			continue: ''
		};
		const domain = this.getDomain( this.sourceLanguage );

		return this.mwPost( domain, query );
	}
}

export default SectionTitlesRequest;
