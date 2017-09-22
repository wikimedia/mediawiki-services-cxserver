'use strict';

var BBPromise = require( 'bluebird' ),
	util = require( 'util' ),
	express = require( 'express' ),
	uuid = require( 'cassandra-uuid' ),
	bunyan = require( 'bunyan' );

/**
 * Error instance wrapping HTTP error responses
 * for automatic error detection, logging and information leakage
 * in route handlers.
 *
 * @param {Response} response HTTP error response
 */
function HTTPError( response ) {
	var msg, key;

	Error.call( this );
	Error.captureStackTrace( this, HTTPError );

	if ( response.constructor !== Object ) {
		// just assume this is just the error message
		msg = response;
		response = {
			status: 500,
			type: 'internal_error',
			title: 'InternalError',
			detail: msg
		};
	}

	this.name = this.constructor.name;
	this.message = String( response.status );
	if ( response.type ) {
		this.message += ': ' + response.type;
	}

	for ( key in response ) {
		this[ key ] = response[ key ];
	}

}

util.inherits( HTTPError, Error );

/**
 * Generates an object suitable for logging out of a request object
 *
 * @param {Request} req request
 * @return {Object} an object containing the key components of the request
 */
function reqForLog( req ) {
	return {
		url: req.originalUrl,
		headers: req.headers,
		method: req.method,
		params: req.params,
		query: req.query,
		body: req.body,
		remoteAddress: req.connection.remoteAddress,
		remotePort: req.connection.remotePort
	};
}

/**
 * Serialises an error object in a form suitable for logging
 *
 * @param {Error} err error to serialise
 * @return {Object} the serialised version of the error
 */
function errForLog( err ) {
	var ret = bunyan.stdSerializers.err( err );
	ret.status = err.status;
	ret.type = err.type;
	ret.detail = err.detail;

	// log the stack trace only for 500 errors
	if ( +ret.status !== 500 ) {
		ret.stack = undefined;
	}

	return ret;
}

/**
 * Generates a unique request ID
 *
 * @return {string} the generated request ID
 */
function generateRequestId() {
	return uuid.TimeUuid.now().toString();
}

/**
 * Wraps all of the given router's handler functions with
 * promised try blocks so as to allow catching all errors,
 * regardless of whether a handler returns/uses promises
 * or not.
 *
 * @param {Object} route the object containing the router and path to bind it to
 * @param {Application} app the application object
 */
function wrapRouteHandlers( route, app ) {

	route.router.stack.forEach( function ( routerLayer ) {
		var path = ( route.path + routerLayer.route.path.slice( 1 ) )
			.replace( /\/:/g, '/--' )
			.replace( /^\//, '' )
			.replace( /[/?]+$/, '' );
		path = app.metrics.normalizeName( path || 'root' );
		routerLayer.route.stack.forEach( function ( layer ) {
			var origHandler = layer.handle;
			layer.handle = function ( req, res, next ) {
				var startTime = Date.now();
				BBPromise.try( function () {
					return origHandler( req, res, next );
				} )
					.catch( next )
					.finally( function () {
						var statusCode, statusClass, stat;
						statusCode = +res.statusCode || 500;
						if ( statusCode < 100 || statusCode > 599 ) {
							statusCode = 500;
						}
						statusClass = Math.floor( statusCode / 100 ) + 'xx';
						stat = path + '.' + req.method + '.';
						app.metrics.endTiming( [ stat + statusCode, stat + statusClass, stat + 'ALL' ],
							startTime );
					} );
			};
		} );
	} );
}

/**
 * Generates an error handler for the given applications
 * and installs it. Usage:
 *
 * @param {Application} app the application object to add the handler to
 */
function setErrorHandler( app ) {
	app.use( function ( err, req, res, next ) {
		var o, errObj, level, respBody;

		if ( !res.status ) {
			next();
		}
		// ensure this is an HTTPError object
		if ( err.constructor === HTTPError ) {
			errObj = err;
		} else if ( err instanceof Error ) {
			// is this an HTTPError defined elsewhere? (preq)
			if ( err.constructor.name === 'HTTPError' ) {
				o = {
					status: err.status
				};
				if ( err.body && err.body.constructor === Object ) {
					Object.keys( err.body ).forEach( function ( key ) {
						o[ key ] = err.body[ key ];
					} );
				} else {
					o.detail = err.body;
				}
				o.message = err.message;
				errObj = new HTTPError( o );
			} else {
				// this is a standard error, convert it
				errObj = new HTTPError( {
					status: 500,
					type: 'internal_error',
					title: err.name,
					detail: err.message,
					stack: err.stack
				} );
			}
		} else if ( err.constructor === Object ) {
			// this is a regular object, suppose it's a response
			errObj = new HTTPError( err );
		} else {
			// just assume this is just the error message
			errObj = new HTTPError( {
				status: 500,
				type: 'internal_error',
				title: 'InternalError',
				detail: err
			} );
		}
		// ensure some important error fields are present
		if ( !errObj.status ) {
			errObj.status = 500;
		}
		if ( !errObj.type ) {
			errObj.type = 'internal_error';
		}
		// add the offending URI and method as well
		if ( !errObj.method ) {
			errObj.method = req.method;
		}
		if ( !errObj.uri ) {
			errObj.uri = req.url;
		}
		// some set 'message' or 'description' instead of 'detail'
		errObj.detail = errObj.detail || errObj.message || errObj.description || '';
		// adjust the log level based on the status code
		level = 'error';
		if ( +errObj.status < 400 ) {
			level = 'trace';
		} else if ( +errObj.status < 500 ) {
			level = 'info';
		}
		// log the error
		( req.logger || app.logger ).log(
			level + '/' + ( errObj.component ? errObj.component : errObj.status ),
			errForLog( errObj )
		);
		// let through only non-sensitive info
		respBody = {
			status: errObj.status,
			type: errObj.type,
			title: errObj.title,
			detail: errObj.detail,
			method: errObj.method,
			uri: errObj.uri
		};
		res.status( errObj.status ).json( respBody );
	} );
}

/**
 * Creates a new router with some default options.
 *
 * @param {Object} [opts] additional options to pass to express.Router()
 * @return {Router} a new router object
 */
function createRouter( opts ) {
	var options = {
		mergeParams: true
	};

	if ( opts && opts.constructor === Object ) {
		Object.keys( opts ).forEach( function ( key ) {
			options[ key ] = opts[ key ];
		} );
	}

	return express.Router( options );

}

/**
 * Adds logger to the request and logs it
 *
 * @param {Request} req request object
 * @param {Application} app application object
 */
function initAndLogRequest( req, app ) {
	req.headers = req.headers || {};
	req.headers[ 'x-request-id' ] = req.headers[ 'x-request-id' ] || generateRequestId();
	req.logger = app.logger.child( {
		// eslint-disable-next-line camelcase
		request_id: req.headers[ 'x-request-id' ],
		request: reqForLog( req, app.conf.log_header_whitelist )
	} );
	req.logger.log( 'trace/req', {
		msg: 'incoming request'
	} );
}

/**
 * Run to completion a thenable-yielding iterator
 *
 * Each value yielded by the iterator is wrapped in a promise, the result of which is fed into
 * iterator.next/iterator.throw . For thenable values, this has the effect of pausing execution
 * until the thenable resolves.
 *
 * @param {Object} iterator An iterator that may yield promises
 * @return {Promise} Promise resolving on the iterator's return/throw value
 */
function spawn( iterator ) {
	return new Promise( function ( resolve, reject ) {
		var resumeNext, resumeThrow;
		function resume( method, value ) {
			var result;
			try {
				result = method.call( iterator, value );
				if ( result.done ) {
					resolve( result.value );
				} else {
					Promise.resolve( result.value ).then( resumeNext, resumeThrow );
				}
			} catch ( err ) {
				reject( err );
			}
		}
		resumeNext = result => resume( iterator.next, result );
		resumeThrow = err => resume( iterator.throw, err );
		resumeNext();
	} );
}

/**
 * Wrap a thenable-yielding generator function to make an async function
 *
 * @param {Function} generator A generator function
 * @return {Function} Function returning a promise resolving on the generator's return/throw value
 */
function async( generator ) {
	return function () {
		return spawn( generator.apply( this, arguments ) );
	};
}

function Deferred() {
	this.promise = new Promise( ( function ( resolve, reject ) {
		this.resolve = resolve;
		this.reject = reject;
	} ).bind( this ) );

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

module.exports = {
	HTTPError,
	initAndLogRequest,
	wrapRouteHandlers,
	setErrorHandler,
	router: createRouter,
	isPlainText,
	spawn,
	async,
	Deferred
};
