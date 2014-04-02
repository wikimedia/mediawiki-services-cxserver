/*jshint node:true */
var qunit = require( 'qunit' );

qunit.setup( {
	log: {
		summary: true,
		errors: true
	}
} );

qunit.run( {
	code: {
		path: './index.js',
		namespace: 'CX'
	},
	tests: [
		'./tests/segmentation/CXSegmenter.test.js',
		'./tests/mt/Rot13/Rot13.test.js',
	]
}, function ( err, report ) {
	if ( err || report.failed ) {
		process.exit( 1 );
	}
} );
