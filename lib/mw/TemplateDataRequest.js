'use strict';

const BatchedAPIRequest = require( './BatchedAPIRequest' );

class TemplateDataRequest extends BatchedAPIRequest {
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
			action: 'templatedata',
			titles: titles.join( '|' ),
			redirects: true
		};
		domain = this.getDomain( this.sourceLanguage );
		return this.mwPost( domain, query );
	}
}

module.exports = TemplateDataRequest;
