'use strict';

/* eslint-disable no-console */

var config, origConfig, myServiceIdx, myService,
	stop, options, runner,
	BBPromise = require( 'bluebird' ),
	ServiceRunner = require( 'service-runner' ),
	logStream = require( './logStream' ),
	fs = require( 'fs' ),
	assert = require( './assert' ),
	yaml = require( 'js-yaml' ),
	extend = require( 'extend' );

// set up the configuration
config = {
	conf: yaml.safeLoad( fs.readFileSync( __dirname + '/../../config.dev.yaml' ) )
};
// build the API endpoint URI by supposing the actual service
// is the last one in the 'services' list in the config file
myServiceIdx = config.conf.services.length - 1;
myService = config.conf.services[ myServiceIdx ];
config.uri = 'http://localhost:' + myService.conf.port + '/';
// no forking, run just one process when testing
// eslint-disable-next-line camelcase
config.conf.num_workers = 0;
// have a separate, in-memory logger only
config.conf.logging = {
	name: 'test-log',
	level: 'trace',
	stream: logStream()
};
// make a deep copy of it for later reference
origConfig = extend( true, {}, config );
stop = function () {
	return BBPromise.resolve();
};
options = null;
runner = new ServiceRunner();

function start( opts ) {

	opts = opts || {};

	if ( !assert.isDeepEqual( options, opts ) ) {
		console.log( 'server options changed; restarting' );
		return stop().then( function () {
			options = opts;
			// set up the config
			config = extend( true, {}, origConfig );
			extend( true, config.conf.services[ myServiceIdx ].conf, options );
			return runner.start( config.conf )
				.then( function () {
					stop = function () {
						console.log( 'stopping test server' );
						return runner.stop().then( function () {
							stop = function () {
								return BBPromise.resolve();
							};
						} );
					};
					return true;
				} );
		} );
	} else {
		return BBPromise.resolve();
	}
}

module.exports.config = config;
module.exports.start = start;
