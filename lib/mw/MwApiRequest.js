/**
 * @external Application
 */

import { Agent, request } from 'undici';
import swaggerrouter from 'swagger-router';
import { HTTPError as _HTTPError } from '../util.js';
import languageDomainNameMapping from './../language-domain-mapping.json' with { type: 'json' };
import lllangParamMapping from './../lllang-param-mapping.json' with { type: 'json' };
const HTTPError = _HTTPError;
const { Template } = swaggerrouter;

class MWApiRequest {
	/**
	 * @param {Object} config Configuration options
	 * @param {Object} config.context Application context
	 * @param {string} config.sourceLanguage Source language
	 * @param {string} [config.targetLanguage] target language
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
	 * @return {Promise} A promise resolving as the response object from the MW API
	 */
	async mwPost( domain, query ) {
		query = query || {};
		query = Object.assign(
			{
				format: 'json'
			},
			query
		);
		const requestTempl = this.context.mwapi_tpl.expand( {
			request: {
				params: {
					domain: domain,
					origin: '*'
				},
				headers: {
					'user-agent': this.context.conf.user_agent
				},
				body: query
			}
		} );
		requestTempl.headers[ 'content-type' ] = 'application/x-www-form-urlencoded';
		const options = {
			method: 'POST',
			headers: requestTempl.headers,
			body: new URLSearchParams( requestTempl.body ).toString(),
			dispatcher: new Agent( { connect: { timeout: 60_000 } } )
		};
		const { statusCode, body } = await request( requestTempl.uri.toString(), options );
		if ( statusCode !== 200 ) {
			// there was an error when calling the upstream service, propagate that
			throw new HTTPError( {
				status: statusCode,
				type: 'api_error',
				detail: `MW API error from URL: ${ requestTempl.uri }`
			} );
		}
		return await body.json();
	}

	/**
	 * Calls the MW API with the supplied query as URL params
	 *
	 * @param {string} domain The domain to issue the request to
	 * @param {Object} query An object with all the query parameters for the MW API
	 * @return {Promise} A promise resolving as the response object from the MW API
	 */
	async mwGet( domain, query ) {
		query = query || {};
		query = Object.assign(
			{
				format: 'json'
			},
			query
		);
		const requestTempl = this.context.mwapi_tpl.expand( {
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

		requestTempl.method = 'GET';
		requestTempl.uri = `${ requestTempl.uri }?${ new URLSearchParams( query ).toString() }`;

		const options = {
			method: 'GET',
			// redirects bypass the proxy and timeout so better to error out explicitly
			redirect: 'error',
			dispatcher: new Agent( { connect: { timeout: 60_000 } } ),
			headers: requestTempl.headers
		};

		const { statusCode, body } = await request( requestTempl.uri, options );

		if ( statusCode !== 200 ) {
			// there was an error when calling the upstream service, propagate that
			throw new HTTPError( {
				status: statusCode,
				type: 'api_error',
				detail: `MW API error from URL: ${ requestTempl.uri }`
			} );
		}
		const resp = await body.json();
		return resp;
	}

	getDomain( language ) {
		const code = this.getSiteCode( language );
		return ( this.context.conf.mw_host || '{lang}.wikipedia.org' ).replace(
			'{lang}',
			code
		);
	}

	/**
	 * Resolve non-standard wikimedia site codes
	 *
	 * @param {string} language Language code
	 * @return {string} Wikipedia site code corresponding to the language code.
	 */
	getSiteCode( language ) {
		return languageDomainNameMapping[ language ] || language;
	}

	/**
	 * Get the language code for the lllang parameter
	 *
	 * @param {string} language
	 * @return {string} Correct lllang parameter value for the given language code
	 */
	getLllangParam( language ) {
		return lllangParamMapping[ language ] ||
			languageDomainNameMapping[ language ] ||
			language;
	}

	/**
	 * Sets up the request templates for MW and RESTBase API requests
	 *
	 * @param {Application} app the application object
	 */
	setupApiTemplates( app ) {
		/* eslint-disable camelcase */
		// set up the MW API request template
		if ( !app.conf.mwapi_req ) {
			app.logger.error( 'mwapi_req not found in configuration' );
		}
		this.context.mwapi_tpl = new Template( this.context.conf.mwapi_req );

		// set up the RESTBase request template
		if ( !app.conf.restbase_req ) {
			app.logger.error( 'restbase_req not found in configuration' );
		}
		this.context.restbase_tpl = new Template( this.context.conf.restbase_req );
		/* eslint-enable camelcase */
	}

	/**
	 * Calls the REST API with the supplied domain, path and request parameters
	 *
	 * @param {string} domain the domain to issue the request for
	 * @param {string} path the REST API path to contact without the leading slash
	 * @param {Object} [restReq={}] the object containing the REST request details
	 * @param {string} [restReq.method=GET] the request method
	 * @param {Object} [restReq.query={}] the query string to send, if any
	 * @param {Object} [restReq.headers={}] the request headers to send
	 * @param {Object} [restReq.body=null] the body of the request, if any
	 * @return {Promise} a promise resolving as the response object from the REST API
	 */
	restApiGet( domain, path, restReq ) {
		restReq = restReq || {};
		path = path[ 0 ] === '/' ? path.slice( 1 ) : path;
		const requestTempl = this.context.restbase_tpl.expand( {
			request: {
				method: 'GET',
				params: {
					domain,
					path
				},
				query: restReq.query,
				headers: Object.assign(
					{
						'user-agent': this.context.conf.user_agent,
						host: domain
					},
					restReq.headers
				)
			}
		} );
		requestTempl.uri = `${ requestTempl.uri }?${ new URLSearchParams( requestTempl.query ).toString() }`;
		const options = {
			method: requestTempl.method,
			headers: requestTempl.headers,
			dispatcher: new Agent( { connect: { timeout: 60_000 } } )
		};

		return request( requestTempl.uri, options );
	}
}

export default MWApiRequest;
