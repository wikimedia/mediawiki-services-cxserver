import { parseArgs } from 'node:util';
import app from './app.js';
import { getConfig } from './lib/util.js';

const { values } = parseArgs( {
	options: {
		config: { type: 'string', short: 'c', default: './config.yaml' }
	},
	strict: false
} );

const configPath = values.config;

console.log( 'Using config file:', configPath );
app( getConfig( configPath ) );
