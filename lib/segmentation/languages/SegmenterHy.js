'use strict';

const findAll = require( '../../lineardoc' ).Utils.findAll;

/**
 * Test a possible Armenian sentence boundary match
 *
 * @param {string} text The plaintext to segment
 * @param {Object} match The possible boundary match (returned by regex.exec)
 * @return {number|null} The boundary offset, or null if not a sentence boundary
 */
function findBoundary( text, match ) {
	const tail = text.slice( match.index + 1, text.length );
	// Include any trailing space
	return match.index + 1 + tail.match( /^\s*/ )[ 0 ].length;
}

/**
 * Find Armenian sentence boundaries
 *
 * @param {string} text The plaintext to segment
 * @return {number[]} Sentence boundary offsets
 */
function getBoundaries( text ) {
	// Regex to find possible Armenian sentence boundaries -
	// the vertsaket sign (։), and the Western colon (:).
	// They are similar in appearance and both are used
	// in the Armenian Wikipedia.
	// The Western full stop must not be used here
	// because it is used for a different purpost in Armenian.
	// Must not use a shared regex instance (re.lastIndex is used).
	return findAll( text, /[։:]/g, findBoundary );
}

module.exports = {
	getBoundaries
};
