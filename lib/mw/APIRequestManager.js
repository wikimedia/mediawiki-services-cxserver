const TitlePairRequest = require( './TitlePairRequest.js' ),
	APIRequest = require( './ApiRequest.js' );

class MWAPIRequestManager {
	constructor( appContext ) {
		this.context = appContext;
	}

	/**
	 * Creates a title pair request for a given title between a given language pair
	 * @param {string} title Source title for which we want to know the target title in the target language
	 * @param {string} sourceLanguage Source language code
	 * @param {string} targetLanguage Target language code
	 * @return {Promise}
	 */
	titlePairRequest( title, sourceLanguage, targetLanguage ) {
		let instance;

		if ( !MWAPIRequestManager.titlePairCache[ sourceLanguage ] ) {
			MWAPIRequestManager.titlePairCache[ sourceLanguage ] = new Map();
		}

		instance = MWAPIRequestManager.titlePairCache[ sourceLanguage ][ targetLanguage ];
		if ( !instance ) {
			instance = new TitlePairRequest( { sourceLanguage, targetLanguage, context: this.context } );
			MWAPIRequestManager.titlePairCache[ sourceLanguage ][ targetLanguage ] = instance;
		}

		return instance.get( title );
	}

	/**
	 * For a given canonical namespace, get the namespace alias in given target language.
	 * @param {string} canonicalNamespace Canonical namespace. Example: File, Talk, Special etc.
	 *   See https://www.mediawiki.org/wiki/Help:Namespaces
	 * @param {string} targetLanguage Target language code
	 * @return {Promise}
	 */
	getNamespaceAlias( canonicalNamespace, targetLanguage ) {
		var instance = new APIRequest( { targetLanguage, context: this.context } );

		// SiteInfo is cached in APIRequest, so we are not adding any caching here.
		return instance.getSiteInfo( targetLanguage ).then( ( siteInfo ) => {
			var namespaceId;
			for ( namespaceId in siteInfo.namespaces ) {
				if ( siteInfo.namespaces.hasOwnProperty( namespaceId ) ) {
					if ( siteInfo.namespaces[ namespaceId ].canonical === canonicalNamespace ) {
						return siteInfo.namespaces[ namespaceId ].name;
					}
				}
			}
			// Fallback
			return canonicalNamespace;
		} );
	}
}

/**
 * MediaWiki API request manager cache instance. We cache the request manager instances for each
 * source language, target language pair. Theoretically this can grow up to 300x300 = 9K items.
 * The cached instances helps to batch the API requests. Also future-ready for API response cache.
 * @type {Map}
 */
MWAPIRequestManager.titlePairCache = new Map();

module.exports = MWAPIRequestManager;
