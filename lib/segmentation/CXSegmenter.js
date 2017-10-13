'use strict';

var LinearDoc = require( '../lineardoc' ),
	segmenters = require( __dirname + '/languages' ).Segmenters;

class CXSegmenter {
	constructor( content, language ) {
		this.parser = new LinearDoc.Parser( new LinearDoc.MwContextualizer() );
		this.parser.init();
		this.getBoundaries = this.getSegmenter( language );
		this.content = content;
		this.originalDoc = null;
		this.segmentedDoc = null;
	}

	segment() {
		this.parser.write( this.content );
		this.originalDoc = this.parser.builder.doc;
		this.segmentedDoc = this.originalDoc.segment( this.getBoundaries );
	}

	/**
	 * Get the segmenter for the given language.
	 *
	 * @param {string} language Language code
	 * @return {Function} The segmenter function
	 */
	getSegmenter( language ) {
		var segmenter;
		if ( !segmenters[ language ] ) {
			// fallback to default segmenter
			segmenter = segmenters.default;
		} else {
			segmenter = segmenters[ language ];
		}

		return segmenter.getBoundaries;
	}

	getSegmentedContent() {
		return this.segmentedDoc.getHtml();
	}

	getSegmentedDoc() {
		return this.segmentedDoc;
	}

}

module.exports = CXSegmenter;
