'use strict';

// Run eslint as part of normal testing
var paths,
	lint = require( 'mocha-eslint' );

paths = [
	'dictionary',
	'mt',
	'lineardoc',
	'pageloader',
	'registry',
	'routes',
	'segmentation',
	'utils',
	'tests/**/*.js',
	'*.js'
];

// Run the tests
lint( paths );
