'use strict';

const bunyan = require( 'bunyan' );

function logStream( logStdout ) {

	const log = [];
	const parrot = bunyan.createLogger( {
		name: 'test-logger',
		level: 'warn'
	} );

	// eslint-disable-next-line no-unused-vars
	function write( chunk, encoding, callback ) {
		try {
			const entry = JSON.parse( chunk );
			const levelMatch = /^(\w+)/.exec( entry.levelPath );
			if ( logStdout && levelMatch ) {
				const level = levelMatch[ 1 ];
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
	// eslint-disable-next-line no-unused-vars
	function end( chunk, encoding, callback ) {
	}

	function get() {
		return log;
	}

	function slice() {

		const beginPos = log.length;
		let endPos = null;

		function halt() {
			if ( endPos === null ) {
				endPos = log.length;
			}
		}

		function getLog() {
			return log.slice( beginPos, endPos );
		}

		return {
			halt: halt,
			get: getLog
		};

	}

	return {
		write: write,
		end: end,
		slice: slice,
		get: get
	};
}

module.exports = logStream;
