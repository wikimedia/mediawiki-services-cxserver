'use strict';

module.exports = {
	Segmenter: require( './segmentation/CXSegmenter.js' ),
	Apertium: require( './mt/Apertium.js' ),
	Yandex: require( './mt/Yandex.js' ),
	MTClient: require( './mt/MTClient.js' ),
	LinearDoc: require( './lineardoc' )
};
