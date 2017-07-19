'use strict';

// Run eslint as part of normal testing
var paths,
	lint = require( 'mocha-eslint' );

paths = [
	'lib/*.js',
	'lib/dictionary',
	'lib/lineardoc',
	'lib/mt',
	'lib/mw',
	'lib/pageloader',
	'lib/routes',
	'lib/segmentation',
	'tests/**/*.js'
];

// Run the tests
lint( paths );
