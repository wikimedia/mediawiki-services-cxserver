'use strict';

module.exports.Segmenters = {
	en: require( __dirname + '/SegmenterEn.js' ),
	ja: require( __dirname + '/SegmenterJa.js' ),
	zh: require( __dirname + '/SegmenterZh.js' ),
	hi: require( __dirname + '/SegmenterHi.js' ),
	sa: require( __dirname + '/SegmenterHi.js' ),
	default: require( __dirname + '/SegmenterDefault.js' )
};
