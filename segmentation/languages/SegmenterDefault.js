var findAll = require( '../../lineardoc' ).Utils.findAll;

/**
 * Test a possible sentence boundary match
 *
 * @param {string} text The plaintext to segment
 * @param {Object} match The possible boundary match (returned by regex.exec)
 * @return {number|null} The boundary offset, or null if not a sentence boundary
 */

function findBoundary( text, match ) {
	var tail = text.slice( match.index + 1, text.length );
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
 * Find English sentence boundaries
 *
 * @param {string} text The plaintext to segment
 * @returns {number[]} Sentence boundary offsets
 */
function getBoundaries( text ) {
	// Regex to find possible English sentence boundaries.
	// Must not use a shared regex instance (re.lastIndex is used)
	return findAll( text, /[.!?]/g, findBoundary );
}

module.exports = {
	getBoundaries: getBoundaries
};
