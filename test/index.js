'use strict';

// Run eslint as part of normal testing
var paths,
	lint = require( 'mocha-eslint' );

paths = [
	'lib/*.js',
	'lib/**/*.js',
	'test/**/*.js',
	'bin/mt',
	'bin/adapt',
	'bin/linearize',
	'bin/segment'
];

// Run the tests
lint( paths );
