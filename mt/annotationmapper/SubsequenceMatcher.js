var levenshteinDistance = require( './LevenshteinDistance.js' );

function SubSequenceMatcher( language ) {
	this.language = language;
}

/*
 * Clean up punctuations
 */
function cleanup( str ) {
	// Beginning
	str = str.replace( /^[\,\.\/#!$%\^&\*;:"{}=_`~()]+/g, '' );
	// End
	str = str.replace( /[\,\.\/#!$%\^&\*;:"{}=_`~()]+$/g, '' );
	// In between string
	str = str.replace( /[\,\/#!$%\^&\*;:"{}=_`~()]+/g, '' );
	return str;
}

/**
 * Tokenize the string to words
 * @param {string} str
 * @return {string[]} array of words
 */
SubSequenceMatcher.prototype.getWords = function ( str ) {
	str = cleanup( str );
	return str.split( /\s+/ ).map( function ( word ) {
		return word.toLowerCase();
	} );
};

/*
 * Get ngrams for the givenn string
 * @param {string} str
 * @param {number} n
 */
SubSequenceMatcher.prototype.getNGrams = function ( str, n ) {
	var i, len, ngrams, words;

	ngrams = [];
	words = this.getWords( str );
	len = words.length;
	for ( i = 0; i <= len - n; i++ ) {
		ngrams.push( words.slice( i, i + n ) );
	}
	return ngrams;
};

/**
 * Approximately compare two strings
 * @param {string} string1
 * @param {string} string2
 * @retun {boolean}
 */
SubSequenceMatcher.prototype.isApproximateEqual = function ( string1, string2 ) {
	var distance = levenshteinDistance( string1, string2 );

	if ( string1 === string2 ) {
		return true;
	}
	if ( distance <= 2 &&
		string2.length > distance + 2 &&
		string1[ 0 ] === string2[ 0 ] ) {
		return true;
	}
	return false;
};

SubSequenceMatcher.prototype.findFuzzyMatch = function ( text, substring ) {
	var i, j, len, substringWordsLength, indices, word, index, startIndex = 0,
		substringNGrams, textNGrams, match;

	// Normalize
	text = text.toLowerCase();
	substring = substring.toLowerCase().trim();

	if ( !substring ) {
		return null;
	}

	substringNGrams = this.getWords( substring );
	substringWordsLength = substringNGrams.length;
	textNGrams = this.getNGrams( text, substringNGrams.length );
	len = textNGrams.length;

	for ( i = 0; i < len; i++ ) {
		match = null;

		for ( j = 0; j < substringWordsLength; j++ ) {
			word = textNGrams[ i ][ j ];
			if ( this.isApproximateEqual( word, substringNGrams[ j ] ) ) {
				match = !match ? word : match + ' ' + word;
			} else {
				break;
			}
		}

		if ( !match ) {
			continue;
		}

		indices = indices || [];
		index = text.indexOf( match, startIndex );

		if ( index === -1 ) {
			//console.log( 'failed to find ' + match + ' in ' + text );
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
};

/*
var s = new SubSequenceMatcher( 'en' );
console.log( s.getNGrams( 'a b c d', 2 ) );
console.log( s.findFuzzyMatch( 'The quick brown fox jumps over the lazy dog', 'jumbs' ) );
console.log( s.findFuzzyMatch( 'The quick brown fox jumps over the lazy dog', 'jumbs ovar' ) );
console.log( s.findFuzzyMatch( 'The quick brown fox "jumps over" the lazy dog', 'jumbs ovar' ) );
*/
module.exports = SubSequenceMatcher;
