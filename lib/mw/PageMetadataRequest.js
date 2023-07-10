'use strict';

const cxutil = require( '../util' );
const MwApiRequest = require( './MwApiRequest' );

class PageMetadataRequest {
	constructor( config ) {
		this.config = config;
		this.promise = null;
	}

	getPromise() {
		if ( !this.promise ) {
			const api = new MwApiRequest( this.config );
			const domain = api.getDomain( this.config.language );

			this.promise = api.mwGet(
				domain,
				{
					action: 'parse',
					page: this.config.title,
					meta: 'siteinfo',
					prop: 'sections',
					format: 'json',
					redirects: true,
					formatversion: 2
				}
			).then( ( res ) => res.parse );
		}

		return this.promise;
	}

	set( value ) {
		this.promise = new cxutil.Deferred().resolve( value );
	}

	/**
	 * Get the size of the cached requests. Used for cache management
	 *
	 * @return {number}
	 */
	getCacheSize() {
		return 1;
	}

	dispose() {
		this.promise = null;
	}

	dumpCache() {
		return this.promise;
	}
}

module.exports = PageMetadataRequest;
