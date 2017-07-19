const TitlePairRequest = require( './TitlePairRequest.js' );

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
}

/**
 * MediaWiki API request manager cache instance. We cache the request manager instances for each
 * source language, target language pair. Theoretically this can grow up to 300x300 = 9K items.
 * The cached instances helps to batch the API requests. Also future-ready for API response cache.
 * @type {Map}
 */
MWAPIRequestManager.titlePairCache = new Map();

module.exports = MWAPIRequestManager;
