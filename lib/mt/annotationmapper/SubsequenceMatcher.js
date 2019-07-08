'use strict';

const levenshteinDistance = require( './LevenshteinDistance' );

class SubSequenceMatcher {
	constructor( language ) {
		this.language = language;
	}

	/*
	* Clean up punctuations
	*/
	static cleanup( str ) {
		// Beginning
		str = str.replace( /^[,./#!$%^&*;:"{}=_`~()]+/g, '' );
		// End
		str = str.replace( /[,./#!$%^&*;:"{}=_`~()]+$/g, '' );
		// In between string
		str = str.replace( /[,/#!$%^&*;:"{}=_`~()]+/g, '' );
		return str;
	}

	/**
	 * Tokenize the string to words
	 *
	 * @param {string} str
	 * @return {string[]} array of words
	 */
	getWords( str ) {
		str = this.constructor.cleanup( str );
		return str.split( /[\s.]+/ ).map( ( word ) => word.toLowerCase() );
	}

	/*
	 * Get ngrams for the given string
	 * @param {string} str
	 * @param {number} n
	 */
	getNGrams( str, n ) {
		const ngrams = [];
		const words = this.getWords( str );
		for ( let i = 0, len = words.length; i <= len - n; i++ ) {
			ngrams.push( words.slice( i, i + n ) );
		}
		return ngrams;
	}

	/**
	 * Approximately compare two strings
	 *
	 * @param {string} string1
	 * @param {string} string2
	 * @return {boolean}
	 */
	isApproximateEqual( string1, string2 ) {
		const distance = levenshteinDistance( string1, string2 );
		if ( string1 === string2 ) {
			return true;
		}
		if ( distance <= 2 &&
			string2.length > distance + 2 &&
			string1[ 0 ] === string2[ 0 ] ) {
			return true;
		}
		return false;
	}

	findFuzzyMatch( text, substring ) {
		let indices, startIndex = 0;
		// Normalize
		text = text.toLowerCase();
		substring = substring.toLowerCase().trim();

		if ( !substring ) {
			return null;
		}

		// console.log( 'Searching [' + substring + '] in [' + text + ']' );
		const substringNGrams = this.getWords( substring );
		const substringWordsLength = substringNGrams.length;
		const textNGrams = this.getNGrams( text, substringNGrams.length );
		const len = textNGrams.length;
		for ( let i = 0; i < len; i++ ) {
			let match = null;
			for ( let j = 0; j < substringWordsLength; j++ ) {
				const word = textNGrams[ i ][ j ];
				if ( this.isApproximateEqual( word, substringNGrams[ j ] ) ) {
					match = !match ? word : match + ' ' + word;
				} else {
					// The match sequence broke.
					// Example:
					// Searching [editor de página del editorial] in [the new york times,
					// el cual tiene un editor tiene un editor ejecutivo sobre las páginas
					// noticiosas y un editor de página del editorial encima páginas de opinión.],
					// [editor ejecutivo] will be the match till here.
					// We do not ignore that match, but will look for better matches.
					break;
				}
			}

			if ( !match ) {
				continue;
			}

			indices = indices || [];
			const index = text.indexOf( match, startIndex );

			if ( index === -1 ) {
				// console.log( 'failed to find ' + match + ' in ' + text );
				// FIXME: This can occur because of multiple punctuations in between token
				break;
			}

			indices.push( {
				start: index,
				length: match.length
			} );

			startIndex = index + match.length;
		}

		return indices;
	}

	/**
	 * Sort function for matching positions based on length.
	 *
	 * @param {number} positionA
	 * @param {number} positionB
	 * @return {number}
	 */
	static comparePositions( positionA, positionB ) {
		if ( positionA.length < positionB.length ) {
			return -1;
		}
		if ( positionA.length > positionB.length ) {
			return 1;
		}
		return 0;
	}

	/**
	 * Find the best match among candidate positions by longest match.
	 *
	 * @param {Object[]} positions
	 * @return {Object} best match position.
	 */
	bestMatch( positions ) {
		positions.sort( this.constructor.comparePositions );
		return positions[ positions.length - 1 ];
	}
}

module.exports = SubSequenceMatcher;
