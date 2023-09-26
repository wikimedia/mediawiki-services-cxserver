'use strict';

const segment = require( 'sentencex' );

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
	 * @return {Function} The function that returns Sentence boundary offsets
	 */
	getSegmenter( language ) {
		return ( text ) => {
			const sentences = segment( language, text );
			const boundaries = [];
			for ( let i = 0; i < sentences.length; i++ ) {
				if ( sentences[ i ].trim().length ) {
					boundaries.push( text.indexOf( sentences[ i ] ) );
				}
			}
			return boundaries;
		};
	}
}

module.exports = CXSegmenter;
