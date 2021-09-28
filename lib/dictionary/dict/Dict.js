'use strict';

const dictClient = require( __dirname + '/DictClient.js' );

function Dict( options ) {
	this.log = options.log || function () {};
	this.registry = require( __dirname + '/DictRegistry.json' );
}

Dict.prototype.findDatabase = function ( source, target ) {
	const dictionaries = this.registry[ source ] && this.registry[ source ][ target ];
	if ( !dictionaries ) {
		this.log( 'info', 'Could not find dictd dictionaries for %s-%s', source, target );
		return null;
	}
	return Object.keys( dictionaries );
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
 *             "info": "",
 *             "sources": ["fd-spa-eng"]
 *         },
 *         ...
 *     ]
 * }
 *
 * @method
 * @param {string} word Source language word or phrase
 * @param {string} from Source language BCP47 code
 * @param {string} to Target language BCP47 code
 * @return {Promise}
 */
Dict.prototype.getTranslations = function ( word, from, to ) {
	const self = this;

	return new Promise( function ( resolve, reject ) {
		const db = this.findDatabase( from, to );
		dictClient.lookup( word, {
			db: db,
			action: 'def',
			suggestions: true,
			error: function ( responseCode, message ) {
				self.log( 'debug', 'Dictd look up failed' );
				reject( new Error( responseCode + ': ' + message ) );
			},
			success: function ( result ) {
				const translations = [];
				self.log( 'debug', 'Dictd look up succeeded' );
				for ( let i = 0; i < result.definitions.length; i++ ) {
					translations.push( {
						text: result.definitions[ i ].def,
						sources: [ db ]
					} );
				}
				resolve( {
					source: word,
					freetext: translations
				} );
			}
		} );
	} );
};

module.exports = Dict;
