'use strict';

// Run eslint as part of normal testing
var paths,
	lint = require( 'mocha-eslint' );

paths = [
	'lib/*.js',
	'lib/**/*.js',
	'test/**/*.js'
];

// Run the tests
lint( paths );
