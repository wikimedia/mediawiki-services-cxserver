var
	BBPromise = require( 'bluebird' ),
	fs = BBPromise.promisifyAll( require( 'fs' ) );

function JsonDict( options ) {
	this.log = options.log || function () {};
	this.registry = require( __dirname + '/JsonDictRegistry.json' );
}

/**
 * Find bilingual dictionaries for the language pair
 *
 * @private
 * @method
 * @param {string} sourceLang Source language BCP47 tag
 * @param {string} targetLang Target language BCP47 tag
 * @return {Object|null} dictionary info, or null if no dictionaries
 * @return {Object} [return.<dictionaryId>] Info for one dictionary
 * @return {string} [return.<dictionaryId>.source] JSON filename
 * @return {string} [return.<dictionaryId>.desc] Description of the source
 */
JsonDict.prototype.findDictionaries = function ( sourceLang, targetLang ) {
	return ( this.registry[ sourceLang ] && this.registry[ sourceLang ][ targetLang ] ) || {};
};

/**
 * Get possible translations and information about them
 *
 * The deferred return structure is like:
 * {
 *     "source": "manzana",
 *     "translations": [
 *         {
 *             "phrase": "apple",
 *             "info": "(noun)",
 *             "sources": ["fd-spa-eng"]
 *         },
 *         ...
 *     ]
 * }
 *
 * @method
 * @param {string} source Source language word or phrase
 * @param {string} sourceLang Source language BCP47 code
 * @param {string} targetLang Target language BCP47 code
 * @return {Object} deferred.promise
 */
JsonDict.prototype.getTranslations = function ( source, sourceLang, targetLang ) {
	var dictionaries, dictionaryId, file, self = this;

	dictionaries = this.findDictionaries( sourceLang, targetLang );
	if ( dictionaries === null ) {
		this.log( 'error', 'JSON dictionary not found for %s-%s', sourceLang, targetLang );
		return BBPromise.resolve( [] );
	}

	// Just use the one dictionary for now
	// TODO: Use all dictionaries
	dictionaryId = Object.keys( dictionaries )[ 0 ];
	file = __dirname + '/' + dictionaries[ dictionaryId ].source;

	// TODO: Cache dictionary files. Use one cache for all files, so we can
	// flush the least frequently used file as necessary.
	return fs.readFileAsync( file, 'utf8' ).then( function ( data ) {
		var results, result, i, len,
			translations = [];
		results = JSON.parse( data )[ source ] || [];
		for ( i = 0, len = results.length; i < len; i++ ) {
			result = results[ i ];
			translations.push( {
				phrase: result[ 0 ],
				info: result[ 1 ],
				sources: [ dictionaryId ]
			} );
		}

		if ( translations.length < 1 ) {
			self.log( 'debug', 'No dictionary entries found' );
		} else {
			self.log( 'debug', 'Dictionary entries found' );
		}

		return ( {
			source: source,
			translations: translations
		} );
	} );
};

module.exports = JsonDict;
