'use strict';

/* eslint-disable no-console */

var bunyan = require( 'bunyan' );

function logStream( logStdout ) {
	var parrot, log = [];

	parrot = bunyan.createLogger( {
		name: 'test-logger',
		level: 'warn'
	} );

	function write( chunk /* , encoding, callback */ ) {
		var entry, level, levelMatch;

		try {
			entry = JSON.parse( chunk );
			levelMatch = /^(\w+)/.exec( entry.levelPath );
			if ( logStdout && levelMatch ) {
				level = levelMatch[ 1 ];
				if ( parrot[ level ] ) {
					parrot[ level ]( entry );
				}
			}
		} catch ( e ) {
			console.error( 'something went wrong trying to parrot a log entry', e, chunk );
		}

		log.push( chunk );
	}

	// to implement the stream writer interface
	// function end( chunk, encoding, callback ) {}

	function get() {
		return log;
	}

	function slice() {
		var begin = log.length,
			end = null;

		function halt() {
			if ( end === null ) {
				end = log.length;
			}
		}

		function get() {
			return log.slice( begin, end );
		}

		return {
			halt: halt,
			get: get
		};

	}

	return {
		write: write,
		// end: end,
		slice: slice,
		get: get
	};
}

module.exports = logStream;
