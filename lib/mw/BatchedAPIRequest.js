'use strict';

const cxutil = require( '../util' );
const MWApiRequest = require( './MwApiRequest' );

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
		const batchRequest = this;

		function rejectSubqueue( rejectQueue ) {
			let i, len;
			for ( i = 0, len = rejectQueue.length; i < len; i++ ) {
				const error = new Error( 'Rejecting items in subqueue from BatchedAPIRequest. ' +
					'This is harmless unless already resolved.' );
				batchRequest.promises.get( rejectQueue[ i ] ).reject( error );
			}
		}

		const processResult = function ( response ) {
			let mappedTitles = [];
			const processed = {};

			if ( response.continue ) {
				throw new Error( 'MediaWiki API query continuation is not implemented' );
			}

			const data = batchRequest.processResponse( response );

			if ( !data?.pages ) {
				return;
			}

			const pages = data.pages;

			[ 'redirects', 'normalized', 'converted' ].forEach( ( map ) => {
				mappedTitles = mappedTitles.concat( ( data && data[ map ] ) || [] );
			} );

			for ( const pageid in pages ) {
				const page = pages[ pageid ];
				const processedPage = batchRequest.processPage( page );
				if ( processedPage !== undefined ) {
					processed[ page.title ] = processedPage;
				}
				for ( let i = 0; i < mappedTitles.length; i++ ) {
					// Locate the title in redirects, if any.
					if ( mappedTitles[ i ].to === page.title ) {
						// Handle both formatversion=1 and formatversion=2 responses
						const isFromencoded = mappedTitles[ i ].fromencoded === '' || mappedTitles[ i ].fromencoded === true;
						const from = isFromencoded ?
							decodeURIComponent( mappedTitles[ i ].from ) :
							mappedTitles[ i ].from;
						processed[ from ] = processedPage;
					}
				}
			}

			batchRequest.set( processed );
		};

		const queue = this.queue;
		this.queue = [];
		while ( queue.length ) {
			const subqueue = queue.splice( 0, 50 );
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

	/**
	 * Get the size of the cached requests. Used for cache management
	 *
	 * @return {number}
	 */
	getCacheSize() {
		return this.promises.size;
	}

	dispose() {
		this.promises.clear();
	}

	/**
	 * Look up data about a title. If the data about this title is already in the cache, this
	 * returns an already-resolved promise. Otherwise, it returns a pending promise and schedules
	 * a request to retrieve the data.
	 *
	 * @param {string} title Title
	 * @return {Promise} Promise that gets resolved when data is available
	 */
	get( title ) {
		if ( this.promises.has( title ) ) {
			return this.promises.get( title );
		}

		this.promises.set( title, new cxutil.Deferred() );
		this.queue.push( title );
		this.dispatch();

		return this.promises.get( title );
	}

	has( title ) {
		return this.promises.has( title );
	}

	/**
	 * Add entries to the cache. Does not overwrite already-set entries.
	 *
	 * @param {Object} entries Object keyed by page title, with the values being data objects
	 */
	set( entries ) {
		for ( const title in entries ) {
			if ( !this.promises.has( title ) ) {
				this.promises.set( title, new cxutil.Deferred() );
			}
			this.promises.get( title ).resolve( entries[ title ] );
		}
	}

	async dumpCache() {
		const output = {};

		for ( const [ title, value ] of this.promises.entries() ) {
			output[ title ] = await value;
		}

		return output;
	}

}
module.exports = BatchedAPIRequest;
