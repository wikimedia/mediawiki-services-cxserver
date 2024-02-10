'use strict';

const { LRUCache } = require( 'lru-cache' );
const SiteInfoRequest = require( './SiteInfoRequest' );
const TemplateDataRequest = require( './TemplateDataRequest' );
const Title = require( 'mediawiki-title' ).Title;
const TitleInfoRequest = require( './TitleInfoRequest' );
const TitlePairRequest = require( './TitlePairRequest' );
const WikidataRequest = require( './WikidataRequest' );
const PageMetadataRequest = require( './PageMetadataRequest' );

function makeLRUCache() {
	// A cache holding instances of BatchedAPIRequest sub classes.
	// Theoretically, for title pair alone, there will be 300*300=90K such instances.
	// Each instance has cached promise requests.
	// By using an LRU cache, we dispose BatchedAPIRequest instances after a defined age.
	// We also check if the total number of cached promises exceed a defined size, if so,
	// least-recently-used instances are disposed.
	return new LRUCache( {
		// The maximum size of the cache, checked by applying the length function.
		// Roughly translates to total number of request promises we cached across all
		// BatchedAPIRequest instances. This will correspond to multiple translations.
		max: 1000,
		// Maximum age of cache in ms. Roughly, time taken for a translation of an article.
		ttl: 15 * 60 * 1000 // 15 minutes
	} );
}

let persistentCache = makeLRUCache();

class MWApiRequestManager {
	constructor( appContext, logger ) {
		this.context = appContext;

		// Why on earth are these interfaces so incompatible?
		this.logger = logger || {
			log: function ( level, msg ) {
				console[ level ]( msg );
			}
		};

		this.offlineMode = false;
		this.titleMap = new Map();
	}

	static get requestCache() {
		return persistentCache;
	}

	setRequestCache( cache ) {
		persistentCache = cache;
	}

	clearCaches() {
		this.titleMap = new Map();
		this.setRequestCache( makeLRUCache() );
	}

	/**
	 * Enqueue a request this is cached and that can be batched.
	 *
	 * Instead of doing a single request per title, information about multiple titles are requested
	 * at once. Results for each title are cached separately. Only requests that have the same cache
	 * key are batched.
	 *
	 * @param {string} cacheKey Unique key used for caching and batching.
	 * @param {Function} ctor Function that returns an instance of BatchedAPIRequest.
	 * @param {string} title
	 * @return {Promise}
	 */
	cachedBatchRequest( cacheKey, ctor, title ) {
		const cache = MWApiRequestManager.requestCache;

		if ( !cache.has( cacheKey ) ) {
			cache.set( cacheKey, ctor.call() );
		}

		const instance = cache.get( cacheKey );
		if ( this.offlineMode && !instance.has( title ) ) {
			throw new Error( `Non-cached access to ${ cacheKey } with title ${ title }.` );
		}

		return instance.get( title );
	}

	/**
	 * Enqueue a request that will be cached.
	 *
	 * @param {string} cacheKey Unique key used for caching and batching.
	 * @param {Function} ctor Function that returns a request.
	 * @return {Promise}
	 */
	cachedRequest( cacheKey, ctor ) {
		const cache = MWApiRequestManager.requestCache;

		if ( !this.offlineMode && !cache.has( cacheKey ) ) {
			cache.set( cacheKey, ctor.call() );
		}

		const instance = cache.get( cacheKey );
		if ( !instance ) {
			throw new Error( `Non-cached access to ${ cacheKey }.` );
		}

		return instance.getPromise();
	}

	/**
	 * For a given canonical namespace, get the namespace alias in given target language.
	 *
	 * @param {string} canonicalNamespace Canonical namespace. Example: File, Talk, Special etc.
	 *   See https://www.mediawiki.org/wiki/Help:Namespaces
	 * @param {string} targetLanguage Target language code
	 * @return {Promise}
	 */
	getNamespaceAlias( canonicalNamespace, targetLanguage ) {
		return this.siteInfoRequest( targetLanguage ).then( ( siteInfo ) => {
			let namespaceId;
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
	 * Creates a title pair request for a given title between a given language pair
	 *
	 * @param {string} title Source title for which we want to know the target title in the
	 *   target language
	 * @param {string} sourceLanguage Source language code
	 * @param {string} targetLanguage Target language code
	 * @return {Promise}
	 */
	titlePairRequest( title, sourceLanguage, targetLanguage ) {
		return this.normalizeTitle( title, sourceLanguage ).then( ( normalizedTitle ) => {
			const cacheKey = `titlepair/${ sourceLanguage }/${ targetLanguage }`;
			const ctor = () => new TitlePairRequest(
				{ sourceLanguage, targetLanguage, context: this.context }
			);
			return this.cachedBatchRequest( cacheKey, ctor, normalizedTitle );
		} );
	}

	/**
	 * Creates a title info request for a given given language
	 *
	 * @param {string} title Title for which we want to get the information
	 * @param {string} sourceLanguage Wiki language for the title
	 * @return {Promise}
	 */
	titleInfoRequest( title, sourceLanguage ) {
		return this.normalizeTitle( title, sourceLanguage ).then( ( normalizedTitle ) => {
			const cacheKey = `titleinfo/${ sourceLanguage }`;
			const ctor = () => new TitleInfoRequest( { sourceLanguage, context: this.context } );
			return this.cachedBatchRequest( cacheKey, ctor, normalizedTitle );
		} );
	}

	/**
	 * Creates a template data request for a given given template and language
	 *
	 * @param {string} title Title including namespace
	 * @param {string} sourceLanguage Wiki language for the title
	 * @param {string[]} hints Params that are likely to be present in template
	 * @return {Promise}
	 */
	templateDataRequest( title, sourceLanguage, hints ) {
		return this.normalizeTitle( title, sourceLanguage ).then( ( normalizedTitle ) => {
			const cacheKey = `templatedata/${ sourceLanguage }`;
			const ctor = () => new TemplateDataRequest( { sourceLanguage, context: this.context, hints } );
			return this.cachedBatchRequest( cacheKey, ctor, normalizedTitle );
		} );
	}

	/**
	 * Gets information from Wikidata
	 *
	 * @param {string} item E.g. Q42
	 * @param {string} language In which language to return results.
	 * @return {Promise}
	 */
	wikidataRequest( item, language ) {
		const cacheKey = `wikidata/${ language }`;
		const ctor = () => new WikidataRequest( { language, context: this.context } );
		return this.cachedBatchRequest( cacheKey, ctor, item );
	}

	siteInfoRequest( sourceLanguage ) {
		const cacheKey = `siteinfo/${ sourceLanguage }`;
		const ctor = () => new SiteInfoRequest( { sourceLanguage, context: this.context } );
		return this.cachedRequest( cacheKey, ctor );
	}

	pageMetadataRequest( language, title ) {
		const cacheKey = `metadata/${ language }/${ title }`;
		const ctor = () => new PageMetadataRequest( { language, title, context: this.context } );
		return this.cachedRequest( cacheKey, ctor );
	}

	normalizeTitle( title, language ) {
		if ( typeof title !== 'string' ) {
			this.logger.log( 'warn', 'Non-string title for normalizeTitle: ' + JSON.stringify( title ) );
		}

		return this.siteInfoRequest( language ).then( ( siteInfo ) => {

			let titleObj;
			// Remove prefixes like './'
			try {
				title = title.replace( /^\.*\//, '' );
				const urlDecodedText = decodeURIComponent( title );
				titleObj = Title.newFromText( urlDecodedText, siteInfo );
			} catch ( e ) {
				// The mediawiki-title node library throws exceptions in case of invalid titles
				// contrary to mw.Title in mediawiki core. If the title is invalid, return null.
				// See https://github.com/wikimedia/mediawiki-title/issues/37
				return null;
			}
			// API wants titles without underscores.
			const normalizedTitle = titleObj.getPrefixedText();

			// Keep record for offline mode
			if ( title !== normalizedTitle ) {
				this.titleMap.set( title, normalizedTitle );
			}

			return normalizedTitle;
		} );
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

	/**
	 * Load previously dumped cached requests. Useful for mocking tests.
	 *
	 * @param {Object} mocks
	 */
	loadCachedRequests( mocks ) {
		for ( const instanceName in mocks ) {
			let instance;
			const data = mocks[ instanceName ];
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
			} else if ( instanceName.startsWith( 'wikidata' ) ) {
				instance = new WikidataRequest( {
					language: instanceName.split( '/' )[ 1 ],
					context: this.context
				} );
			} else if ( instanceName.startsWith( 'siteinfo' ) ) {
				instance = new SiteInfoRequest( {
					sourceLanguage: instanceName.split( '/' )[ 1 ],
					context: this.context
				} );
			} else if ( instanceName.startsWith( 'metadata' ) ) {
				instance = new PageMetadataRequest( {
					language: instanceName.split( '/' )[ 1 ],
					title: instanceName.split( '/' )[ 2 ],
					context: this.context
				} );
			} else if ( instanceName === '#titles' ) {
				this.titleMap = new Map();
				Object.keys( data ).forEach( ( title ) => {
					this.titleMap.set( title, data[ title ] );
				} );

				continue;
			} else {
				throw new Error( `No constructor defined for ${ instanceName }` );
			}

			instance.set( data );
			MWApiRequestManager.requestCache.set( instanceName, instance );
		}
	}

	/**
	 * Get a dump of cached requests. Useful for creating mocks for testing.
	 *
	 * @return {Promise}
	 */
	async dumpCachedRequests() {
		const cache = MWApiRequestManager.requestCache;

		const output = {};
		for ( const key of cache.keys() ) {
			output[ key ] = await cache.get( key ).dumpCache();
		}

		output[ '#titles' ] = this.titleMap;

		return output;
	}
}

module.exports = MWApiRequestManager;
