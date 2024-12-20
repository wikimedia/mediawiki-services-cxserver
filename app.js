'use strict';

/**
 * @external Application
 */

const http = require( 'http' );
const https = require( 'https' );
const express = require( 'express' );
const compression = require( 'compression' );
const bodyParser = require( 'body-parser' );
const fs = require( 'fs' );
const sUtil = require( './lib/util' );
const packageInfo = require( './package.json' );
const CXConfig = require( './lib/Config.js' );
const yaml = require( 'js-yaml' );
const addShutdown = require( 'http-shutdown' );
const PrometheusClient = require( './lib/metric.js' );
const { logger } = require( './lib/logging.js' );
const infoRoutes = require( './lib/routes/info' );
const rootRoutes = require( './lib/routes/root' );
const v1Routes = require( './lib/routes/v1' ).router;
const v2Routes = require( './lib/routes/v2' );

const defaultConfig = {
	name: packageInfo.name,
	port: 8888,
	interface: '0.0.0.0',
	// eslint-disable-next-line camelcase
	compression_level: 3,
	cors: '*',
	csp: 'default-src \'self\'; object-src \'none\'; media-src *; img-src *; style-src *; frame-ancestors \'self\'',
	// eslint-disable-next-line camelcase
	log_header_whitelist: [
		'cache-control', 'content-type', 'content-length', 'if-match',
		'user-agent', 'x-request-id'
	],
	specfile: `${ __dirname }/spec.yaml`
};

/**
 * Creates an express app and initialises it
 *
 * @param {Object} options the options to initialise the app with
 * @return {Express} the express app object
 */
function initApp( options ) {
	const app = express();

	options = Object.assign( {}, defaultConfig, options );

	// get the options and make them available in the app
	app.logger = logger(
		options.name,
		options.logging
	);
	app.logger.log( 'info', `Starting ${ options.name }` );
	app.conf = options; // this app's config options
	app.info = packageInfo; // this app's package info
	app.metrics = new PrometheusClient( {
		collectDefaultMetrics: true,
		staticLabels: { service: options.name }
	} ); // the metrics

	// set outgoing proxy
	if ( app.conf.proxy ) {
		process.env.HTTP_PROXY = app.conf.proxy;
		// if there is a list of domains which should
		// not be proxied, set it
		if ( app.conf.no_proxy_list ) {
			if ( Array.isArray( app.conf.no_proxy_list ) ) {
				process.env.NO_PROXY = app.conf.no_proxy_list.join( ',' );
			} else {
				process.env.NO_PROXY = app.conf.no_proxy_list;
			}
		}
	}

	// eslint-disable-next-line camelcase
	app.conf.log_header_whitelist = new RegExp( `^(?:${ app.conf.log_header_whitelist.map( ( item ) => item.trim() ).join( '|' ) })$`, 'i' );

	try {
		app.conf.spec = yaml.load( fs.readFileSync( app.conf.specfile ) );
	} catch ( e ) {
		app.logger.log( 'warn/spec', `Could not load the spec: ${ e }` );
		app.conf.spec = {};
	}

	// set the CORS and CSP headers.
	app.all( '*', ( req, res, next ) => {
		if ( app.conf.cors !== false ) {
			res.header( 'access-control-allow-origin', app.conf.cors );
			res.header( 'access-control-allow-headers', 'accept, authorization, x-requested-with, content-type, x-wikimedia-debug' );
			res.header( 'access-control-expose-headers', 'etag' );
		}
		if ( app.conf.csp !== false ) {
			res.header( 'x-xss-protection', '1; mode=block' );
			res.header( 'x-content-type-options', 'nosniff' );
			res.header( 'x-frame-options', 'SAMEORIGIN' );
			res.header( 'content-security-policy', app.conf.csp );
			res.header( 'x-content-security-policy', app.conf.csp );
			res.header( 'x-webkit-csp', app.conf.csp );
		}

		next();
	} );

	// disable the X-Powered-By header
	app.set( 'x-powered-by', false );
	// disable the ETag header.Yet to identify a valid need for cxserver.
	app.set( 'etag', false );
	// enable compression
	app.use( compression( {
		level: app.conf.compression_level
	} ) );
	// use the application/x-www-form-urlencoded parser
	app.use( bodyParser.urlencoded( {
		extended: true,
		limit: 500000 // 0.5 megabyte
	} ) );
	// use the JSON body parser
	app.use( bodyParser.json( {
		limit: 500000
	} ) );

	// Add a middleware to log the response time
	app.use( sUtil.responseTimeMetricsMiddleware( app ) );

	app.use( ( req, res, next ) => {
		app.logger.info( `${ req.method } ${ req.originalUrl } ${ res.statusCode }` );
		next();
	} );

	app.use( '/', rootRoutes );
	app.use( '/v1', v1Routes );
	app.use( '/v2', v2Routes );
	app.use( '/_info', infoRoutes );
	app.get( '/metrics', async ( req, res ) => {
		res.set( 'Content-Type', app.metrics.client.register.contentType );
		res.end( await app.metrics.metrics() );
	} );

	// Catch and handle propagated errors
	app.use( ( err, req, res, next ) => {
		app.logger.error( 'Error details:', {
			message: err.message,
			stack: err.stack,
			status: err.status
		} );

		if ( res.headersSent ) {
			return next( err );
		}
		res.status( err.status || 500 );

		res.json( {
			error: {
				message: err.message || 'Internal Server Error',
				status: err.status
			}
		} );

	} );

	app.registry = new CXConfig( app );

	return app;
}

/**
 * Creates and starts the service's web server
 *
 * @param {Application} app the app object to use in the service
 * @return {Promise} a promise creating the web server
 */
function createServer( app ) {
	// return a promise which creates an HTTP or HTTPS server,
	// attaches the app to it, and starts accepting
	// incoming client requests
	let server;
	const isHttps = app.conf.private_key && app.conf.certificate;
	if ( isHttps ) {
		const credentials = {
			key: fs.readFileSync( app.conf.private_key ),
			cert: fs.readFileSync( app.conf.certificate )
		};
		server = https.createServer( credentials, app );
	} else {
		server = http.createServer( app );
	}

	return new Promise( ( resolve ) => {
		server = server.listen( app.conf.port, app.conf.interface, resolve );
		server = addShutdown( server );
	} ).then( () => {
		app.logger.log( 'info',
			`Worker ${ process.pid } listening on http${ isHttps ? 's' : '' }://${ app.conf.interface || '*' }:${ app.conf.port }` );
		return server;
	} );
}

module.exports = function ( options ) {
	const app = initApp( options );
	createServer( app );
	process.on( 'unhandledRejection', ( reason /* promise */ ) => {
		app.logger.error( 'Unhandled Promise Rejection', {
			error: reason,
			stack: reason.stack
		} );
	} );
	return app;
};

module.exports.initApp = initApp;
