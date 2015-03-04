'use strict';

module.exports.Segmenters = {
	en: require( __dirname + '/SegmenterEn.js' ),
	hi: require( __dirname + '/SegmenterHi.js' ),
	hy: require( __dirname + '/SegmenterHy.js' ),
	ja: require( __dirname + '/SegmenterJa.js' ),
	pa: require( __dirname + '/SegmenterHi.js' ),
	sa: require( __dirname + '/SegmenterHi.js' ),
	zh: require( __dirname + '/SegmenterZh.js' ),
	default: require( __dirname + '/SegmenterDefault.js' )
};
