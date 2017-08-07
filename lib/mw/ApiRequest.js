'use strict';

const apiUtil = require( '../api-util.js' ),
	preq = require( 'preq' ),
	cxUtil = require( '../util.js' ),
	Title = require( 'mediawiki-title' ).Title,
	cxutil = require( '../util.js' ),
	languageDomainNameMapping = require( './../language-domain-mapping.json' ),
	HTTPError = cxUtil.HTTPError;

class MWApiRequest {
	/**
	 * @param {Object} config Configuration options
	 * @cfg {Object} context Application context
	 * @cfg {string} [sourceLanguage] Source language
	 * @cfg {string} [targetLanguage] target language
	 */
	constructor( config ) {
		this.context = config.context;
		// Source and target languages
		this.sourceLanguage = config.sourceLanguage;
		this.targetLanguage = config.targetLanguage;
		apiUtil.setupApiTemplates( config.context );
	}

	/**
	 * Calls the MW API with the supplied query as its body
	 *
	 * @param {string} domain The domain to issue the request to
	 * @param {Object} query An object with all the query parameters for the MW API
	 * @param {string} method The HTTP method to use - get or post
	 * @return {Promise} A promise resolving as the response object from the MW API
	 */
	mwRequest( domain, query, method ) {
		var request;
		query = query || {};
		query.continue = query.continue || '';
		query.format = 'json';
		request = this.context.mwapi_tpl.expand( {
			request: {
				params: {
					domain: domain,
					origin: '*'
				},
				headers: {
					'user-agent': this.context.conf.user_agent
				}
			}
		} );
		if ( method === 'get' ) {
			request.query = query;
		} else if ( method === 'post' ) {
			request.body = query;
			request.headers[ 'content-type' ] = 'application/x-www-form-urlencoded';
		}
		return preq[ method ]( request ).then( ( response ) => {
			if ( response.status < 200 || response.status > 399 ) {
				// there was an error when calling the upstream service, propagate that
				throw new HTTPError( {
					status: response.status,
					type: 'api_error',
					title: 'MW API error',
					detail: response.body
				} );
			}
			return response.body;
		} );
	}

	/**
	 * Calls the MW API with the supplied query as its body
	 *
	 * @param {string} domain The domain to issue the request to
	 * @param {Object} query An object with all the query parameters for the MW API
	 * @return {Promise} A promise resolving as the response object from the MW API
	 */
	mwPost( domain, query ) {
		return this.mwRequest( domain, query, 'post' );
	}

	/**
	 * Calls the MW API with the supplied query as URL params
	 *
	 * @param {string} domain The domain to issue the request to
	 * @param {Object} query An object with all the query parameters for the MW API
	 * @return {Promise} A promise resolving as the response object from the MW API
	 */
	mwGet( domain, query ) {
		return this.mwRequest( domain, query, 'get' );
	}

	getDomain( language ) {
		return this.getSiteCode( language ) + '.wikipedia.org';
	}

	/**
	 * Resolve non-standard wikimedia site codes
	 * @param {string} language Language code
	 * @return {string} Wikipedia site code corresponding to the language code.
	 */
	getSiteCode( language ) {
		return languageDomainNameMapping[ language ] || language;
	}

	/**
	 * Fetch the site information for a given language
	 * @param  {string} language
	 * @return {Promise}
	 */
	getSiteInfo( language ) {
		var query,
			domain = this.getDomain( language );
		if ( MWApiRequest.siteInfoCache[ domain ] ) {
			return MWApiRequest.siteInfoCache[ domain ];
		}

		query = {
			action: 'query',
			meta: 'siteinfo',
			siprop: 'general|namespaces|namespacealiases|specialpagealiases',
			format: 'json',
			formatversion: 2
		};

		MWApiRequest.siteInfoCache[ domain ] = this.mwGet( domain, query )
			.then( ( res ) => res.query );
		return MWApiRequest.siteInfoCache[ domain ];
	}
}

/**
 * Normalize the title of the response
 *
 * @param {string} title Title
 * @param {string} language language
 * @return {Promise} Promise resolved with the normalized title
 */
MWApiRequest.prototype.normalizeTitle = cxutil.async( function* ( title, language ) {
	var titleObj, siteInfo;
	siteInfo = yield this.getSiteInfo( language );
	// Remove prefixes like './'
	title = title.replace( /^\.*\//, '' );
	titleObj = Title.newFromText( title, siteInfo );
	if ( !titleObj ) {
		return title;
	}
	return titleObj.getPrefixedDBKey();
} );

MWApiRequest.siteInfoCache = new Map();

module.exports = MWApiRequest;
