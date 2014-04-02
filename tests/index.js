/*jshint node:true */
var qunit = require( 'qunit' ),
	tests = [
		'./tests/segmentation/CXSegmenter.test.js',
		'./tests/mt/Rot13/Rot13.test.js',
	];

qunit.setup( {
	log: process.argv[ 2 ] ? qunit.options.log : {
		summary: true,
		errors: true
	},
	code: {
		path: './index.js',
		namespace: 'CX'
	}
} );

qunit.run( {
	tests: process.argv[ 2 ] || tests
}, function ( err, report ) {
	if ( err || report.failed ) {
		process.exit( 1 );
	}
} );
