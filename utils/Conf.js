/**
 * ContentTranslation server
 *
 * @file
 * @copyright See AUTHORS.txt
 * @license GPL-2.0+
 */

'use strict';

var config, customConfig,
	defaultConfig = require( __dirname + '/../config.defaults.js' );
try {
	customConfig = require( __dirname + '/../config.js' );
} catch ( e ) {
	if ( e.code === 'MODULE_NOT_FOUND' ) {
		// Custom configuration file missing. That is acceptable.
		customConfig = {};
	} else {
		// Corrupted custom configuration file. Fail.
		throw new Error( 'Invalid configuration file.\n' + e );
	}
}

function readConfig() {
	var key,
		config = {};
	for ( key in defaultConfig ) {
		if ( key in customConfig ) {
			config[ key ] = customConfig[ key ];
		} else {
			config[ key ] = defaultConfig[ key ];
		}
	}
	return config;
}

function get( key ) {
	if ( !config ) {
		config = readConfig();
	}
	if ( !( key in config ) ) {
		throw new Error( 'Missing config key: "' + key + '"' );
	}
	return config[ key ];
}

module.exports = get;
