module.exports = {
	Segmenter: require( './segmentation/CXSegmenter.js' ).CXSegmenter,
	Apertium: require( './mt/Apertium.js' ),
	LinearDoc: require( './lineardoc/LinearDoc.js' ),
	Dictionary: require( './dictionary' )
};
