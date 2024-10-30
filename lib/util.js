'use strict';

/**
 * @external Application
 * @external Request
 * @external Router
 */

const yaml = require( 'js-yaml' );
const fs = require( 'fs' );

/**
 * Error instance wrapping HTTP error responses
 */
class HTTPError extends Error {

	constructor( response ) {
		super();
		Error.captureStackTrace( this, HTTPError );

		if ( response.constructor !== Object ) {
			// just assume this is just the error message
			response = {
				status: 500,
				type: 'internal_error',
				title: 'InternalError',
				detail: response
			};
		}

		this.name = this.constructor.name;
		this.message = `${ response.status }`;
		if ( response.type ) {
			this.message += `: ${ response.type }`;
		}

		Object.assign( this, response );
	}
}

function responseTimeMetricsMiddleware( app ) {
	// Create a histogram metric for HTTP request duration
	const requestDuration = {
		type: 'Histogram',
		name: `${ app.conf.name }_express_router_request_duration_seconds`,
		help: 'request duration handled by router in seconds',
		buckets: [ 0.01, 0.05, 0.1, 0.3, 1 ],
		labels: {
			names: [ 'path', 'method', 'status' ]
		}
	};
	// Create the metric
	// This will return the existing metric if it already exists
	const responseTimeMetric = app.metrics.makeMetric( requestDuration );
	app.logger.info( 'responseTimeMetric', responseTimeMetric.labels );
	return ( req, res, next ) => {
		const start = process.hrtime();
		const originalEnd = res.end;

		res.end = ( ...args ) => {
			// Calculate the duration
			const diff = process.hrtime( start );
			const duration = diff[ 0 ] + diff[ 1 ] / 1e9;

			const path = req.route ? req.route.path : req.path;
			// Observe the duration
			responseTimeMetric.observe(
				{
					method: req.method,
					path: path,
					status: res.statusCode
				},
				duration
			);
			// Call the original end function
			originalEnd.apply( res, args );
		};
		// Continue processing the request
		next();
	};
}

function Deferred() {
	this.promise = new Promise( ( ( resolve, reject ) => {
		this.resolve = resolve;
		this.reject = reject;
	} ) );

	this.then = this.promise.then.bind( this.promise );
	this.catch = this.promise.catch.bind( this.promise );
}

/**
 * Check if the given content is plain text or contains html tags.
 * The check is performed by looking for open and close tags.
 * If the content has HTML entities, this test will not identify it.
 *
 * @param {string} content The content to test
 * @return {boolean} Return true if the content is plain text
 */
function isPlainText( content ) {
	return !content || !content.trim() || !/<[a-zA-Z][\s\S]*>/i.test( content );
}

/**
 * Null safe object getter
 * Example: To access obj.a.b.c[0].d in null safe way,
 * use getProp(['a', 'b', 'c', 0, 'd'], obj )
 *
 * @param {string|number} path access path
 * @param {Object} obj Object
 * @return {Object|string|number|null}
 */
function getProp( path, obj ) {
	return path.reduce(
		( accumulator, currentValue ) => ( accumulator && accumulator[ currentValue ] ) ?
			accumulator[ currentValue ] :
			null,
		obj
	);
}

function getConfig( confPath ) {
	if ( !confPath ) {
		confPath = `${ __dirname }/../config.dev.yaml`;
	}
	const config = yaml.load( fs.readFileSync( confPath ) );
	if ( !config ) {
		throw new Error( 'Failed to load config from path: ' + confPath );
	}
	return config;
}

module.exports = {
	HTTPError,
	getConfig,
	responseTimeMetricsMiddleware,
	getProp,
	Deferred,
	isPlainText
};
