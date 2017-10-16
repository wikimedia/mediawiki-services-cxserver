'use strict';

const preq = require( 'preq' ),
	cxUtil = require( '../util.js' ),
	Title = require( 'mediawiki-title' ).Title,
	cxutil = require( '../util.js' ),
	Template = require( 'swagger-router' ).Template,
	languageDomainNameMapping = require( './../language-domain-mapping.json' ),
	HTTPError = cxUtil.HTTPError;

class MWApiRequest {
	/**
	 * @param {Object} config Configuration options
	 * @cfg {Object} context Application context
	 * @cfg {string} sourceLanguage Source language
	 * @cfg {string} [targetLanguage] target language
	 */
	constructor( config ) {
		this.context = config.context;
		// Source and target languages
		this.sourceLanguage = config.sourceLanguage;
		this.targetLanguage = config.targetLanguage;
		this.setupApiTemplates( config.context );
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
			request.method = 'get';
			request.query = query;
			delete request.body;
		} else if ( method === 'post' ) {
			request.method = 'post';
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
		return ( this.context.conf.mw_host || '{lang}.wikipedia.org' ).replace( '{lang}', language );
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

	htmlToWikiText( html, language ) {
		const domain = this.getDomain( language );

		if ( cxUtil.isPlainText( html ) ) {
			// Does not contain HTML elements. Save api call.
			return Promise.resolve( html );
		}

		const restReq = {
			method: 'post',
			body: { html },
			headers: {
				// See https://www.mediawiki.org/wiki/Specs/HTML/1.5.0
				accept: 'text/html; charset=utf-8; profile="https://www.mediawiki.org/wiki/Specs/HTML/1.5.0"'
			}
		};
		const path = '/transform/html/to/wikitext';

		return this.restApiGet( domain, path, restReq )
			.then( ( response ) => response.body );
	}

	wikitextToHTML( wikitext, language ) {
		const domain = this.getDomain( language );

		if ( !wikitext || !wikitext.trim() ) {
			// Save api call.
			return Promise.resolve( wikitext );
		}

		const restReq = {
			method: 'post',
			body: {
				wikitext,
				// eslint-disable-next-line camelcase
				body_only: true
			},
			headers: {
				// See https://www.mediawiki.org/wiki/Specs/HTML/1.5.0
				accept: 'text/html; charset=utf-8; profile="https://www.mediawiki.org/wiki/Specs/HTML/1.5.0"'
			}
		};
		const path = '/transform/wikitext/to/html';

		return this.restApiGet( domain, path, restReq )
			.then( ( response ) => response.body );
	}

	/**
	 * Sets up the request templates for MW and RESTBase API requests
	 *
	 * @param {Application} app the application object
	 */
	setupApiTemplates( app ) {
		/* eslint-disable camelcase */
		// set up the MW API request template
		if ( !this.context.conf.mwapi_req ) {
			this.context.conf.mwapi_req = {
				uri: 'https://{{domain}}/w/api.php',
				headers: {
					'user-agent': '{{user-agent}}'
				},
				query: '{{ default(request.query, {}) }}',
				body: '{{request.body}}'
			};
		}
		this.context.mwapi_tpl = new Template( this.context.conf.mwapi_req );

		// set up the RESTBase request template
		if ( !app.conf.restbase_req ) {
			app.conf.restbase_req = {
				method: '{{request.method}}',
				uri: 'http://{{domain}}/api/rest_v1/{+path}',
				query: '{{ default(request.query, {}) }}',
				headers: '{{request.headers}}',
				body: '{{request.body}}'
			};
		}
		app.restbase_tpl = new Template( this.context.conf.restbase_req );
		/* eslint-enable camelcase */
	}

	/**
	 * Calls the REST API with the supplied domain, path and request parameters
	 *
	 * @param {string} domain the domain to issue the request for
	 * @param {string} path the REST API path to contact without the leading slash
	 * @param {Object} [restReq={}] the object containing the REST request details
	 * @param {string} [restReq.method=get] the request method
	 * @param {Object} [restReq.query={}] the query string to send, if any
	 * @param {Object} [restReq.headers={}] the request headers to send
	 * @param {Object} [restReq.body=null] the body of the request, if any
	 * @return {Promise} a promise resolving as the response object from the REST API
	 *
	 */
	restApiGet( domain, path, restReq ) {
		restReq = restReq || {};
		path = path[ 0 ] === '/' ? path.slice( 1 ) : path;

		const request = this.context.restbase_tpl.expand( {
			request: {
				method: restReq.method,
				params: {
					domain,
					path
				},
				query: restReq.query,
				headers: Object.assign( {
					'user-agent': this.context.conf.user_agent
				}, restReq.headers ),
				body: restReq.body
			}
		} );
		return preq( request );
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
	// API wants titles without underscores.
	return titleObj.getPrefixedText();
} );

MWApiRequest.siteInfoCache = new Map();

module.exports = MWApiRequest;
