'use strict';

const ApiRequest = require( './ApiRequest' );
const TemplateDataRequest = require( './TemplateDataRequest' );
const TitleInfoRequest = require( './TitleInfoRequest' );
const TitlePairRequest = require( './TitlePairRequest' );
const cxutil = require( '../util' );
const LRU = require( 'lru-cache' );

// A cache holding instances of BatchedAPIRequest sub classes.
// Theoretically, for title pair alone, there will be 300*300=90K such instances.
// Each instance has cached promise requests.
// By using an LRU cache, we dispose BatchedAPIRequest instances after a defined age.
// We also check if the total number of cached promises exceed a defined size, if so,
// least-recently-used instances are disposed.
let instanceCache = new LRU( {
	// The maximum size of the cache, checked by applying the length function.
	// Roughly translates to total number of request promises we cached across all
	// BatchedAPIRequest instances. This will correspond to multiple translations.
	max: 1000,
	length: ( item ) => item.getCacheSize(),
	// Function that is called on items when they are dropped from the cache.
	dispose: ( key, item ) => item.dispose(),
	// Maximum age in ms. Items are not pro-actively pruned out as they age,
	// but if you try to get an item that is too old, it'll drop it and return
	// undefined instead of giving it to you.
	// Maximum age of cache in ms. Roughly, time taken for a translation of an article.
	maxAge: 15 * 60 * 1000 // 15 minutes
} );

class MWApiRequestManager {
	constructor( appContext ) {
		this.context = appContext;
		this.offlineMode = false;
	}

	static get caches() { return instanceCache; }

	cachedRequest( cacheKey, ctor, ...args ) {
		if ( !this.offlineMode && !MWApiRequestManager.caches.has( cacheKey ) ) {
			MWApiRequestManager.caches.set( cacheKey, ctor.call() );
		}

		const instance = MWApiRequestManager.caches.get( cacheKey );
		if ( !instance ) {
			return new cxutil.Deferred().reject( new Error( 'Trying to access non-cached result in offline mode' ) );
		}

		return instance.get( ...args );
	}

	/**
	 * Creates a title pair request for a given title between a given language pair
	 * @param {string} title Source title for which we want to know the target title in the
	 *   target language
	 * @param {string} sourceLanguage Source language code
	 * @param {string} targetLanguage Target language code
	 * @return {Promise}
	 */
	titlePairRequest( title, sourceLanguage, targetLanguage ) {
		const cacheKey = `titlepair/${sourceLanguage}/${targetLanguage}`;
		const ctor = () => new TitlePairRequest(
			{ sourceLanguage, targetLanguage, context: this.context }
		);
		return this.cachedRequest( cacheKey, ctor, title );
	}

	/**
	 * For a given canonical namespace, get the namespace alias in given target language.
	 * @param {string} canonicalNamespace Canonical namespace. Example: File, Talk, Special etc.
	 *   See https://www.mediawiki.org/wiki/Help:Namespaces
	 * @param {string} targetLanguage Target language code
	 * @return {Promise}
	 */
	getNamespaceAlias( canonicalNamespace, targetLanguage ) {
		var instance = new ApiRequest( { targetLanguage, context: this.context } );

		// SiteInfo is cached in ApiRequest, so we are not adding any caching here.
		return instance.getSiteInfo( targetLanguage ).then( ( siteInfo ) => {
			var namespaceId;
			for ( namespaceId in siteInfo.namespaces ) {
				if ( Object.prototype.hasOwnProperty.call( siteInfo.namespaces, namespaceId ) ) {
					if ( siteInfo.namespaces[ namespaceId ].canonical === canonicalNamespace ) {
						return siteInfo.namespaces[ namespaceId ].name;
					}
				}
			}
			// Fallback
			return canonicalNamespace;
		} );
	}

	/**
	 * Creates a title info request for a given given language
	 * @param {string} title Title for which we want to get the information
	 * @param {string} sourceLanguage Wiki language for the title
	 * @return {Promise}
	 */
	titleInfoRequest( title, sourceLanguage ) {
		const cacheKey = `titleinfo/${sourceLanguage}`;
		const ctor = () => new TitleInfoRequest( { sourceLanguage, context: this.context } );
		return this.cachedRequest( cacheKey, ctor, title );
	}

	/**
	 * Creates a template data request for a given given template and language
	 * @param {string} title Title including namespace
	 * @param {string} sourceLanguage Wiki language for the title
	 * @return {Promise}
	 */
	templateDataRequest( title, sourceLanguage ) {
		const cacheKey = `templatedata/${sourceLanguage}`;
		const ctor = () => new TemplateDataRequest( { sourceLanguage, context: this.context } );
		return this.cachedRequest( cacheKey, ctor, title );
	}

	/**
	 * Clear caches.
	 */
	clearCaches() {
		MWApiRequestManager.caches.reset();
	}

	/**
	 * Throw an error if uncached data is requested.
	 */
	enableOfflineMode() {
		this.offlineMode = true;
	}

	/**
	 * Enable uncached requests (default mode).
	 */
	disableOfflineMode() {
		this.offlineMode = false;
	}

}

/**
 * Get a dump of cached requests. Useful for creating mocks for testing.
 * @return {Promise}
 */
MWApiRequestManager.prototype.dumpCachedRequests = cxutil.async( function* () {
	const output = {};
	for ( let instance in MWApiRequestManager.caches.keys() ) {
		output[ instance ] = yield MWApiRequestManager.caches.get( instance ).dumpCache();
	}

	return output;
} );

/**
 * Load previously dumped cached requests. Useful for mocking tests.
 * @param {Object} mocks
 */
MWApiRequestManager.prototype.loadCachedRequests = function ( mocks ) {
	for ( let instanceName in mocks ) {
		let instance;
		if ( instanceName.startsWith( 'titleinfo' ) ) {
			instance = new TitleInfoRequest( {
				sourceLanguage: instanceName.split( '/' )[ 1 ],
				context: this.context
			} );
		} else if ( instanceName.startsWith( 'templatedata' ) ) {
			instance = new TemplateDataRequest( {
				sourceLanguage: instanceName.split( '/' )[ 1 ],
				context: this.context
			} );
		} else if ( instanceName.startsWith( 'titlepair' ) ) {
			instance = new TitlePairRequest( {
				sourceLanguage: instanceName.split( '/' )[ 1 ],
				targetLanguage: instanceName.split( '/' )[ 2 ],
				context: this.context
			} );
		}

		let data = mocks[ instanceName ];
		if ( data[ '#titles' ] ) {
			let titles = data[ '#titles' ];
			instance.titleMap = new Map();
			Object.keys( titles ).forEach( ( title ) => {
				instance.titleMap.set( title, titles[ title ] );
			} );
		}
		instance.set( data );
		MWApiRequestManager.caches.set( instanceName, instance );
	}
};

module.exports = MWApiRequestManager;
