import BatchedAPIRequest from './BatchedAPIRequest.js';

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
		const query = {
				action: 'query',
				prop: 'pageprops|pageimages|description|info',
				piprop: 'thumbnail',
				pithumbsize: 80,
				pilimit: titles.length,
				ppprop: 'wikibase_item',
				titles: titles.join( '|' ),
				redirects: true,
				continue: ''
			},
			domain = this.getDomain( this.sourceLanguage );

		return this.mwGet( domain, query );
	}
}

export default TitleInfoRequest;
