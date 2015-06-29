'use strict';

module.exports.Segmenters = {
	am: require( __dirname + '/SegmenterAm.js' ),
	hi: require( __dirname + '/SegmenterHi.js' ),
	hy: require( __dirname + '/SegmenterHy.js' ),
	ja: require( __dirname + '/SegmenterJa.js' ),
	pa: require( __dirname + '/SegmenterHi.js' ),
	sa: require( __dirname + '/SegmenterHi.js' ),
	ti: require( __dirname + '/SegmenterAm.js' ),
	zh: require( __dirname + '/SegmenterZh.js' ),
	default: require( __dirname + '/SegmenterDefault.js' )
};
