import yargs from 'yargs';
import app from './app.js';
import { getConfig } from './lib/util.js';

const argv = yargs( process.argv.slice( 2 ) )
	.option( 'c', {
		alias: 'config',
		describe: 'Path to the config file',
		type: 'string',
		default: './config.yaml'
	} )
	.argv;

const configPath = argv.c;

console.log( 'Using config file:', configPath );
app( getConfig( configPath ) );
