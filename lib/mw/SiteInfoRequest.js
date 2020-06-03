'use strict';

const MwApiRequest = require( './MwApiRequest' );
const cxutil = require( '../util' );

class SiteInfoRequest {
	constructor( config ) {
		this.config = config;
		this.promise = null;
	}

	getPromise() {
		if ( !this.promise ) {
			const api = new MwApiRequest( this.config );
			this.promise = api.mwGet(
				api.getDomain( this.config.sourceLanguage ),
				{
					action: 'query',
					meta: 'siteinfo',
					siprop: 'general|namespaces|namespacealiases|specialpagealiases',
					format: 'json',
					formatversion: 2
				}
			).then( ( res ) => res.query );
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

module.exports = SiteInfoRequest;
