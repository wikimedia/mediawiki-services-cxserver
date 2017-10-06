'use strict';

const cxutil = require( '../util' );
const MWApiRequest = require( './ApiRequest' );

/**
 * MediaWiki API batch queue.
 *
 * Used to queue up lists of items centrally to get information about in batches of requests.
 *
 * @class
 * @extends MWApiRequest
 * @constructor
 * @param {Object} config Configuration
 */
class BatchedAPIRequest extends MWApiRequest {
	constructor( config ) {
		super( config );
		// Keys are titles, values are promises
		this.promises = new Map();
		this.titleMap = {};

		// Array of page titles queued to be looked up
		this.queue = [];
		this.dispatchTimer = null;
	}

	/**
	 * Process the response object into a format which has keys pages and redirects.
	 *
	 * @method
	 * @param {Object} response The response object
	 * @return {Object}
	 */
	processResponse( response ) {
		return response;
	}

	/**
	 * Process each page in the response of an API request
	 *
	 * @abstract
	 * @method
	 * @param {Object} page The page object
	 * @return {Object|undefined} Any relevant info that we want to cache and return.
	 */
	processPage() {
		throw new Error( 'Not implemented!' );
	}

	/**
	 * Get an API request promise to deal with a list of titles
	 *
	 * @abstract
	 * @return {Promise}
	 */
	getRequestPromise() {
		throw new Error( 'Not implemented!' );
	}

	/**
	 * Perform any scheduled API requests.
	 *
	 * @private
	 */
	processQueue() {
		var subqueue, queue, processResult,
			batchRequest = this;

		function rejectSubqueue( rejectQueue ) {
			var i, len;
			for ( i = 0, len = rejectQueue.length; i < len; i++ ) {
				batchRequest.promises[ rejectQueue[ i ] ].reject();
			}
		}

		processResult = cxutil.async( function*( response ) {
			let processed = {};

			if ( response.continue ) {
				throw new Error( 'MediaWiki API query continuation is not implemented' );
			}

			const data = batchRequest.processResponse( response );
			const pages = data.pages || [];
			const redirects = data.redirects || {};

			for ( let pageid in pages ) {
				let page = pages[ pageid ];
				let processedPage = batchRequest.processPage( page, redirects );
				if ( processedPage !== undefined ) {
					processed[ page.title ] = processedPage;
				}
				for ( let i in redirects ) {
					// Locate the title in redirects, if any.
					if ( redirects[ i ].to === page.title ) {
						processed[ redirects[ i ].from ] = processedPage;
						break;
					}
				}
			}
			yield batchRequest.set( processed );
		} );

		queue = this.queue;
		this.queue = [];
		while ( queue.length ) {
			subqueue = queue.splice( 0, 50 );
			this.getRequestPromise( subqueue )
				.then( processResult )

				// Reject everything in subqueue; this will only reject the ones
				// that weren't already resolved above, because .reject() on an
				// already resolved Deferred is a no-op.
				.then( rejectSubqueue.bind( null, subqueue ) );
		}
	}

	/**
	 * Dispatch the queue for processing when there is gap in the arrival of requests,
	 * or when the queue size exceed a given size.
	 */
	dispatch() {
		if ( this.queue.length >= 100 ) {
			// Process the queue immediately.
			this.processQueue();
		}
		if ( this.dispatchTimer ) {
			clearTimeout( this.dispatchTimer );
		}
		this.dispatchTimer = setTimeout( this.processQueue.bind( this ), 10 );
	}
}

/**
 * Look up data about a title. If the data about this title is already in the cache, this
 * returns an already-resolved promise. Otherwise, it returns a pending promise and schedules
 * a request to retrieve the data.
 *
 * @param {string} title Title
 * @return {Promise} Promise that gets resolved when data is available
 */
BatchedAPIRequest.prototype.get = cxutil.async( function* ( title ) {
	var normalizedTitle;
	if ( typeof title !== 'string' ) {
		// Don't bother letting things like undefined or null make it all the way through,
		// just reject them here. Otherwise they'll cause problems or exceptions at random
		// other points in this file.
		return Promise.reject( 'Invalid title' );
	}
	normalizedTitle = yield this.normalizeTitle( title, this.sourceLanguage );
	if ( !Object.prototype.hasOwnProperty.call( this.promises, normalizedTitle ) ) {
		this.promises[ normalizedTitle ] = new cxutil.Deferred();
		this.queue.push( normalizedTitle );
		this.dispatch();
	}
	if ( title !== normalizedTitle ) {
		this.titleMap[ title ] = normalizedTitle;
	}
	return this.promises[ normalizedTitle ];
} );

/**
 * Add entries to the cache. Does not overwrite already-set entries.
 *
 * @param {Object} entries Object keyed by page title, with the values being data objects
 */
BatchedAPIRequest.prototype.set = cxutil.async( function* ( entries ) {
	var normalizedTitle, title;
	for ( title in entries ) {
		// TODO: This call to normalizeTitle looks useless, as that is already done in get()
		normalizedTitle = yield this.normalizeTitle( title, this.sourceLanguage );
		if ( !Object.prototype.hasOwnProperty.call( this.promises, normalizedTitle ) ) {
			this.promises[ normalizedTitle ] = new cxutil.Deferred();
		}
		this.promises[ normalizedTitle ].resolve( entries[ title ] );
	}
} );

BatchedAPIRequest.prototype.dumpCache = cxutil.async( function* () {
	const output = {};
	for ( let title in this.promises ) {
		output[ title ] = yield this.promises[ title ];
	}

	output[ '#titles' ] = this.titleMap;
	return output;
} );

module.exports = BatchedAPIRequest;
