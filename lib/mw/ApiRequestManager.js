'use strict';

const ApiRequest = require( './ApiRequest' );
const TemplateDataRequest = require( './TemplateDataRequest' );
const TitleInfoRequest = require( './TitleInfoRequest' );
const TitlePairRequest = require( './TitlePairRequest' );
const cxutil = require( '../util' );

/*
 * MediaWiki API request manager cache instance.
 *
 * Theoretically this can grow up to 300x300 = 90K items for titlePair requests alone.
 * The cached instances helps to batch the API requests.
 * @type {Map}
 */
let instanceCache = new Map();
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
	 * @param {string} title Source title for which we want to know the target title in the target language
	 * @param {string} sourceLanguage Source language code
	 * @param {string} targetLanguage Target language code
	 * @return {Promise}
	 */
	titlePairRequest( title, sourceLanguage, targetLanguage ) {
		const cacheKey = `titlepair/${sourceLanguage}/${targetLanguage}`;
		const ctor = () => new TitlePairRequest( { sourceLanguage, targetLanguage, context: this.context } );
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
		MWApiRequestManager.caches.clear();
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
	for ( let [ instance, value ] of MWApiRequestManager.caches.entries() ) {
		output[ instance ] = yield value.dumpCache();
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
			instance.titleMap = data[ '#titles' ];
		}
		instance.set( data );
		MWApiRequestManager.caches.set( instanceName, instance );
	}
};

module.exports = MWApiRequestManager;
