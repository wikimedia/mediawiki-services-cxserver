/**
 * ContentTranslation Server - Segmenter
 *
 * @file
 * @ingroup Extensions
 * @copyright See AUTHORS.txt
 * @license GPL-2.0+
 */

'use strict';

var LinearDoc = require( '../lineardoc/LinearDoc' ),
	logger = require( __dirname + '/../utils/Logger.js' ),
	getBoundariesDefault = require( './SegmenterDefault' ).getBoundaries,
	getBoundariesEn = require( './SegmenterEn' ).getBoundaries,
	getBoundariesHi = require( './SegmenterHi' ).getBoundaries;

function getBoundaryFunction( language ) {
	if ( language === 'en' ) {
		return getBoundariesEn;
	} else if ( language === 'hi' ) {
		return getBoundariesHi;
	} else {
		logger.warn( 'Using fallback boundary function for language: ' + JSON.stringify( language ) );
		return getBoundariesDefault;
	}
}

function CXSegmenter( content, language ) {
	this.parser = new LinearDoc.Parser();
	this.parser.init();
	this.getBoundaries = getBoundaryFunction( language );
	this.content = content;
	this.originalDoc = null;
	this.segmentedDoc = null;
}

CXSegmenter.prototype.segment = function () {
	this.parser.write( this.content );
	this.originalDoc = this.parser.builder.doc;
	this.segmentedDoc = this.originalDoc.segment( this.getBoundaries );
};

CXSegmenter.prototype.getSegmentedContent = function () {
	return this.segmentedDoc.getHtml();
};

module.exports.CXSegmenter = CXSegmenter;
