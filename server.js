'use strict';

const app = require( './app.js' );
const yargs = require( 'yargs' );
const { getConfig } = require( './lib/util.js' );

yargs.option( 'c', {
	alias: 'config',
	describe: 'Path to the config file',
	type: 'string',
	coerce: ( arg ) => require( 'path' ).resolve( arg ),
	default: `${ __dirname }/config.yaml`
} );
const configPath = yargs.argv.c;

console.log( 'Using config file:', configPath );
app( getConfig( configPath ) );
