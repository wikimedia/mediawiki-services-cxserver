var dictClient = require( __dirname + '/DictClient.js' ),
	dictRegistry = require( __dirname + '/DictRegistry.json' ),
	Q = require( 'q' );

function findDatabase( source, target ) {
	var dictionaries = dictRegistry[ source ] && dictRegistry[ source ][ target ];
	if ( !dictionaries ) {
		return null;
	}
	return Object.keys( dictionaries );
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
 *             "info": "",
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
function getTranslations( word, from, to ) {
	var deferred = Q.defer(),
		db;
	db = findDatabase( from, to );
	dictClient.lookup( word, {
		db: db,
		action: 'def',
		suggestions: true,
		error: function ( responseCode, message ) {
			deferred.reject( new Error( responseCode + ': ' + message ) );
		},
		success: function ( result ) {
			var i, translations = [];
			for ( i = 0; i < result.definitions.length; i++ ) {
				translations.push( {
					text: result.definitions[ i ].def,
					sources: [ db ]
				} );
			}
			deferred.resolve( {
				source: word,
				freetext: translations
			} );
		}
	} );
	return deferred.promise;
}

module.exports.getTranslations = getTranslations;
