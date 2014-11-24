module.exports = {
	Segmenter: require( './segmentation/CXSegmenter.js' ).CXSegmenter,
	Apertium: require( './mt/Apertium.js' ),
	Yandex: require( './mt/Yandex.js' ),
	MTClient: require( './mt/MTClient.js' ),
	LinearDoc: require( './lineardoc/LinearDoc.js' ),
	Dictionary: require( './dictionary' )
};
