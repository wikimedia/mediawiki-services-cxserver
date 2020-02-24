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

			const path = `/page/metadata/${encodeURIComponent( this.config.title )}`;
			// Example URL https://en.wikipedia.org/api/rest_v1/page/metadata/Oxygen
			this.promise = api.restApiGet( domain, path )
				.then( ( response ) => response.body );
		}

		return this.promise;
	}

	set( value ) {
		this.promise = new cxutil.Deferred().resolve( value );
	}

	/**
	 * Get the size of the cached requests. Used for cache management
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
