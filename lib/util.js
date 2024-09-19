'use strict';

/**
 * @external Application
 * @external Request
 * @external Router
 */

const express = require( 'express' );
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

/**
 * Wraps all of the given router's handler functions with
 * promised try blocks so as to allow catching all errors,
 * regardless of whether a handler returns/uses promises
 * or not.
 *
 * @param {!Object} route the object containing the router and path to bind it to
 * @param {!Application} app the application object
 */
function wrapRouteHandlers( route, app ) {

	route.router.stack.forEach( ( routerLayer ) => {
		const path = ( route.path + routerLayer.route.path.slice( 1 ) )
			.replace( /\/:/g, '/--' )
			.replace( /^\//, '' )
			.replace( /[/?]+$/, '' );
		routerLayer.route.stack.forEach( ( layer ) => {
			const origHandler = layer.handle;
			let metric;
			if ( app.metrics && app.metrics.makeMetric ) {
				metric = app.metrics.makeMetric( {
					type: 'Histogram',
					name: 'cxserver_express_router_request_duration_seconds',
					help: 'request duration handled by router in seconds',
					buckets: [ 0.01, 0.05, 0.1, 0.3, 1 ],
					labels: {
						names: [ 'path', 'method', 'status' ],
						omitLabelNames: true
					}
				} );
			}
			layer.handle = ( req, res, next ) => {
				const startTime = Date.now();
				Promise.resolve( origHandler( req, res, next ) )
					.catch( next )
					.finally( () => {
						let statusCode = parseInt( res.statusCode, 10 ) || 500;
						if ( statusCode < 100 || statusCode > 599 ) {
							statusCode = 500;
						}
						if ( metric ) {
							metric.endTiming( startTime, [ path || 'root', req.method, statusCode ] );
						}
					} );
			};
		} );
	} );

}

/**
 * Creates a new router with some default options.
 *
 * @param {?Object} [opts] additional options to pass to express.Router()
 * @return {!Router} a new router object
 */
function createRouter( opts ) {

	const options = {
		mergeParams: true
	};

	if ( opts && opts.constructor === Object ) {
		Object.assign( options, opts );
	}

	return new express.Router( options );

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
	wrapRouteHandlers,
	router: createRouter,
	getProp,
	Deferred,
	isPlainText
};
