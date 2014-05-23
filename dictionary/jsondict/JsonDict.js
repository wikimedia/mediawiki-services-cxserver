var dictRegistry = require( __dirname + '/JsonDictRegistry.json' ),
	fs = require( 'fs' ),
	Q = require( 'q' );

/**
 * Find bilingual dictionaries for the language pair
 *
 * @private
 * @method
 * @param {string} sourceLang Source language BCP47 tag
 * @param {string} targetLang Target language BCP47 tag
 * @returns {Object|null} dictionary info, or null if no dictionaries
 * @returns {Object} [return.<dictionaryId>] Info for one dictionary
 * @returns {string} [return.<dictionaryId>.source] JSON filename
 * @returns {string} [return.<dictionaryId>.desc] Description of the source
 */
function findDictionaries( sourceLang, targetLang ) {
	return ( dictRegistry[sourceLang] && dictRegistry[sourceLang][targetLang] ) || {};
}

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
 * @returns {Object} deferred.promise
 */
function getTranslations( source, sourceLang, targetLang ) {
	var deferred = Q.defer(),
		dictionaries, dictionaryId, file;

	dictionaries = findDictionaries( sourceLang, targetLang );
	if ( dictionaries === null ) {
		deferred.resolve( [] );
		return deferred.promise;
	}

	// Just use the one dictionary for now
	// TODO: Use all dictionaries
	dictionaryId = Object.keys( dictionaries )[0];
	file = __dirname + '/' + dictionaries[dictionaryId].source;

	// TODO: Cache dictionary files. Use one cache for all files, so we can
	// flush the least frequently used file as necessary.
	fs.readFile( file, 'utf8', function ( err, data ) {
		var results, result, i, len,
			translations = [];
		if ( err ) {
			deferred.reject( 'Error: ' + err );
			return;
		}
		results = JSON.parse( data )[source] || [];
		for ( i = 0, len = results.length; i < len; i++ ) {
			result = results[i];
			translations.push( {
				'phrase': result[0],
				'info': result[1],
				'sources': [dictionaryId]
			} );
		}
		deferred.resolve( { 'source': source, 'translations': translations } );
	} );
	return deferred.promise;
}

module.exports.getTranslations = getTranslations;
