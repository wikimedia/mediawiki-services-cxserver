'use strict';

const segmenters = require( __dirname + '/languages' ).Segmenters;

class CXSegmenter {

	/**
	 * Segment the given parsed linear document object
	 *
	 * @param {Object} parsedDoc
	 * @param {string} language
	 * @return {Object}
	 */
	segment( parsedDoc, language ) {
		return parsedDoc.segment( this.getSegmenter( language ) );
	}

	/**
	 * Get the segmenter for the given language.
	 *
	 * @param {string} language Language code
	 * @return {Function} The segmenter function
	 */
	getSegmenter( language ) {
		let segmenter;
		if ( !segmenters[ language ] ) {
			// fallback to default segmenter
			segmenter = segmenters.default;
		} else {
			segmenter = segmenters[ language ];
		}

		return segmenter.getBoundaries;
	}
}

module.exports = CXSegmenter;
