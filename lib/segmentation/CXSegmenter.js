'use strict';

var LinearDoc = require( '../lineardoc' ),
	segmenters = require( __dirname + '/languages' ).Segmenters;

function CXSegmenter( content, language ) {
	this.parser = new LinearDoc.Parser();
	this.parser.init();
	this.getBoundaries = this.getSegmenter( language );
	this.content = content;
	this.originalDoc = null;
	this.segmentedDoc = null;
}

CXSegmenter.prototype.segment = function () {
	this.parser.write( this.content );
	this.originalDoc = this.parser.builder.doc;
	this.segmentedDoc = this.originalDoc.segment( this.getBoundaries );
};

/**
 * Get the segmenter for the given language.
 *
 * @param {string} language Language code
 * @return {Function} The segmenter function
 */
CXSegmenter.prototype.getSegmenter = function ( language ) {
	var segmenter;
	if ( !segmenters[ language ] ) {
		// fallback to default segmenter
		segmenter = segmenters[ 'default' ];
	} else {
		segmenter = segmenters[ language ];
	}

	return segmenter.getBoundaries;
};

CXSegmenter.prototype.getSegmentedContent = function () {
	return this.segmentedDoc.getHtml();
};

module.exports = CXSegmenter;
