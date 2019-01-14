'use strict';

module.exports.Segmenters = {
	am: require( __dirname + '/SegmenterAm' ),
	hi: require( __dirname + '/SegmenterHi' ),
	hy: require( __dirname + '/SegmenterHy' ),
	ja: require( __dirname + '/SegmenterJa' ),
	pa: require( __dirname + '/SegmenterHi' ),
	sa: require( __dirname + '/SegmenterHi' ),
	ti: require( __dirname + '/SegmenterAm' ),
	zh: require( __dirname + '/SegmenterZh' ),
	default: require( __dirname + '/SegmenterDefault' )
};
