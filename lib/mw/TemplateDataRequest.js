'use strict';

const BatchedAPIRequest = require( './BatchedAPIRequest' );

class TemplateDataRequest extends BatchedAPIRequest {
	processPage( page ) {
		if ( page.revisions && page.revisions[ 0 ] ) {
			let title,
				pageContent = '';
			if ( page.revisions && page.revisions[ 0 ] ) {
				pageContent = page.revisions[ 0 ].content;
				title = page.title;
			}
			// Return values in the format of templatedata
			return {
				title,
				params: this.extractParametersFromTemplateCode( pageContent )
			};
		}

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

		return this.mwPost( domain, query ).then( ( resp ) => {
			if ( !Object.keys( resp.pages ).length ) {
				// Templatedata does not exist. Try to get template parameter information
				// by reading the source code of template.
				return this.getTemplateParamsUsingSource( titles );
			}
			return resp;
		} );
	}

	/**
	 * Fetch the template source code and extract the template parameters from it.
	 *
	 * @param {string[]} titles Template name with namespace prefix.
	 * @return {Object}
	 */
	getTemplateParamsUsingSource( titles ) {
		const query = {
			formatversion: 2,
			action: 'query',
			titles: titles.join( '|' ),
			redirects: true,
			prop: 'revisions',
			rvprop: 'content'
		};
		const domain = this.getDomain( this.sourceLanguage );

		return this.mwPost( domain, query ).then( ( resp ) => resp.query );
	}

	/**
	 * Retrieve template parameters from the template code.
	 * Adapted from https://he.wikipedia.org/wiki/MediaWiki:Gadget-TemplateParamWizard.js
	 *
	 * @param {string} templateCode Source of the template.
	 * @return {Object} An associative array of parameters that appear in the template code
	 */
	extractParametersFromTemplateCode( templateCode ) {
		let matches,
			templateParams = {},
			paramExtractor = /{{3,}(.*?)[<|}]/mg;

		while ( ( matches = paramExtractor.exec( templateCode ) ) !== null ) {
			let paramName = matches[ 1 ].trim();
			// See https://www.mediawiki.org/wiki/Extension:TemplateData#Param
			// We are not setting any values to the parameter object.
			templateParams[ paramName ] = {};
		}

		return templateParams;
	}
}

module.exports = TemplateDataRequest;
