'use strict';

const findAll = require( '../../lineardoc' ).Utils.findAll;

/**
 * Test a possible Hindi sentence boundary match
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
 * Find Hindi sentence boundaries
 *
 * @param {string} text The plaintext to segment
 * @return {number[]} Sentence boundary offsets
 */
function getBoundaries( text ) {
	// Regex to find possible Hindi sentence boundaries.
	// Must not use a shared regex instance (re.lastIndex is used)
	return findAll( text, /[।!?]/g, findBoundary );
}

module.exports = {
	getBoundaries
};
