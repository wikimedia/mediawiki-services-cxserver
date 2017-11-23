'use strict';

const findAll = require( '../../lineardoc' ).Utils.findAll;

/**
 * Test a possible English sentence boundary match
 *
 * @param {string} text The plaintext to segment
 * @param {Object} match The possible boundary match (returned by regex.exec)
 * @return {number|null} The boundary offset, or null if not a sentence boundary
 */
function findBoundary( text, match ) {
	const tail = text.slice( match.index + 1, text.length );
	const head = text.slice( 0, match.index );

	// Trailing non-final punctuation: not a sentence boundary
	if ( tail.match( /^[,;:]/ ) ) {
		return null;
	}
	// Next word character is number or lower-case: not a sentence boundary
	if ( tail.match( /^\W*[0-9a-z]/ ) ) {
		return null;
	}

	// Do not break in abbreviations. Example D. John, St. Peter
	const lastWord = head.match( /(\w*)$/ )[ 0 ];
	// Exclude at most 2 letter abbreviations. Examples: T. Dr. St. Jr. Sr. Ms. Mr.
	// But not all caps like "UK." as in  "UK. Not US",
	if ( lastWord.length <= 2 && lastWord.match( /^\W*[A-Z][a-z]?$/ ) && tail.match( /^\W*[A-Z]/ ) ) {
		return null;
	}

	// Include any closing punctuation and trailing space
	return match.index + 1 + tail.match( /^['”"’]*\s*/ )[ 0 ].length;
}

/**
 * Find English sentence boundaries
 *
 * @param {string} text The plaintext to segment
 * @return {number[]} Sentence boundary offsets
 */
function getBoundaries( text ) {
	// Regex to find possible English sentence boundaries.
	// Must not use a shared regex instance (re.lastIndex is used)
	return findAll( text, /[.!?]/g, findBoundary );
}

module.exports = {
	getBoundaries
};
