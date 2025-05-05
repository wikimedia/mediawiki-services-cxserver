/**
 * @external Application
 */

import { Agent } from 'undici';
import swaggerrouter from 'swagger-router';
import { HTTPError as _HTTPError } from '../util.js';
import languageDomainNameMapping from './../language-domain-mapping.json' assert { type: 'json' };
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
		query = Object.assign( {
			format: 'json'
		}, query );
		const request = this.context.mwapi_tpl.expand( {
			request: {
				params: {
					domain: domain,
					origin: '*'
				},
				headers: {
					'user-agent': this.context.conf.user_agent,
					'content-type': 'application/x-www-form-urlencoded'
				},
				body: query
			}
		} );

		const options = {
			method: 'POST',
			headers: request.headers,
			body: new URLSearchParams( request.body ),
			dispatcher: new Agent( { connect: { timeout: 60_000 } } )
		};

		const response = await fetch( request.uri, options );
		if ( !response.ok ) {
			// there was an error when calling the upstream service, propagate that
			throw new HTTPError( {
				status: response.status,
				type: 'api_error',
				detail: `MW API error from URL: ${ request.uri }`
			} );
		}

		return await response.json();
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
		query = Object.assign( {
			format: 'json'
		}, query );
		const request = this.context.mwapi_tpl.expand( {
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

		request.method = 'GET';
		request.uri = `${ request.uri }?${ new URLSearchParams( query ).toString() }`;

		const options = {
			method: 'GET',
			headers: request.headers,
			dispatcher: new Agent( { connect: { timeout: 60_000 } } )
		};

		const response = await fetch( request.uri, options );

		if ( !response.ok ) {
			// there was an error when calling the upstream service, propagate that
			throw new HTTPError( {
				status: response.status,
				type: 'api_error',
				detail: `MW API error from URL: ${ request.uri }`
			} );
		}

		return await response.json();

	}

	getDomain( language ) {
		const code = this.getSiteCode( language );
		return ( this.context.conf.mw_host || '{lang}.wikipedia.org' ).replace( '{lang}', code );
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
		const request = this.context.restbase_tpl.expand( {
			request: {
				method: 'GET',
				params: {
					domain,
					path
				},
				query: restReq.query,
				headers: Object.assign( {
					'user-agent': this.context.conf.user_agent,
					host: domain
				}, restReq.headers )
			}
		} );
		request.uri = `${ request.uri }?${ new URLSearchParams( request.query ).toString() }`;
		const options = {
			method: request.method,
			headers: request.headers,
			dispatcher: new Agent( { connect: { timeout: 60_000 } } )
		};

		return fetch( request.uri, options );
	}
}

export default MWApiRequest;
