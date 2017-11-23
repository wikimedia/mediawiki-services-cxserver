'use strict';

const findAll = require( '../../lineardoc' ).Utils.findAll;

/**
 * Test a possible Ethiopic sentence boundary match
 *
 * @param {string} text The plaintext to segment
 * @param {Object} match The possible boundary match (returned by regex.exec)
 * @return {number|null} The boundary offset, or null if not a sentence boundary
 */

function findBoundary( text, match ) {
	const tail = text.slice( match.index + 1, text.length );

	// Trailing non-final punctuation: not a sentence boundary
	if ( tail.match( /^[,;:]/ ) ) {
		return null;
	}

	// Next word character is number or lower-case: not a sentence boundary
	if ( tail.match( /^\W*[0-9a-z]/ ) ) {
		return null;
	}

	// Include any closing punctuation and trailing space
	return match.index + 1 + tail.match( /^['”"’]*\s*/ )[ 0 ].length;
}

/**
 * Find Ethiopic sentence boundaries
 *
 * @param {string} text The plaintext to segment
 * @return {number[]} Sentence boundary offsets
 */
function getBoundaries( text ) {
	// Regex to find possible Ethiopic sentence boundaries.
	// Must not use a shared regex instance (re.lastIndex is used).
	// In the Ethiopic script ። is used as a full stop.
	return findAll( text, /[።!?]/g, findBoundary );
}

module.exports = {
	getBoundaries: getBoundaries
};
