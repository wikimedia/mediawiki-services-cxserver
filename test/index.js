'use strict';

// Run eslint as part of normal testing
var paths,
	lint = require( 'mocha-eslint' );

paths = [
	'lib/*.js',
	'lib/**/*.js',
	'config/*.js',
	'test/**/*.js',
	'bin/*',
	'!bin/generateDocs.sh'
];

// Run the tests
lint( paths );
