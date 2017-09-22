'use strict';

var preq = require( 'preq' ),
	Template = require( 'swagger-router' ).Template;

/**
 * Calls the REST API with the supplied domain, path and request parameters
 *
 * @param {Object} app the application object
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
function restApiGet( app, domain, path, restReq ) {
	var request;
	restReq = restReq || {};
	path = path[ 0 ] === '/' ? path.slice( 1 ) : path;

	request = app.restbase_tpl.expand( {
		request: {
			method: restReq.method,
			params: {
				domain: domain,
				path: path
			},
			query: restReq.query,
			headers: Object.assign( {
				'user-agent': app.conf.user_agent
			}, restReq.headers ),
			body: restReq.body
		}
	} );

	return preq( request );
}

/**
 * Sets up the request templates for MW and RESTBase API requests
 *
 * @param {Application} app the application object
 */
function setupApiTemplates( app ) {
	/* eslint-disable camelcase */
	// set up the MW API request template
	if ( !app.conf.mwapi_req ) {
		app.conf.mwapi_req = {
			uri: 'https://{{domain}}/w/api.php',
			headers: {
				'user-agent': '{{user-agent}}'
			},
			query: '{{ default(request.query, {}) }}',
			body: '{{request.body}}'
		};
	}
	app.mwapi_tpl = new Template( app.conf.mwapi_req );

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
	app.restbase_tpl = new Template( app.conf.restbase_req );
	/* eslint-enable camelcase */
}

module.exports = {
	restApiGet: restApiGet,
	setupApiTemplates: setupApiTemplates
};
