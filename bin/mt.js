#!/usr/bin/env node

/* eslint-disable n/no-process-exit */

import { readFileSync } from 'fs';
import { logger } from '../lib/logging.js';
import { getConfig } from '../lib/util.js';
import PrometheusClient from '../lib/metric.js';
import * as MTClients from '../lib/mt/index.js';

const cxConfig = getConfig();
cxConfig.logger = logger(
	cxConfig.name,
	cxConfig.logging
);
cxConfig.metrics = new PrometheusClient( {
	staticLabels: { service: 'cxserver' }
} );

function showHelpAndExit() {
	const script = process.argv[ 1 ];
	process.stderr.write(
		'Usage: node ' + script + ' <sourceLang> <targetLang> < xhtmlSource\n\n' +
		'Example:\n\techo "<p>A <b>red</b> box.</p>" | node ' + script + ' Apertium en es\n\n'
	);
	process.exit( 1 );
}

const args = process.argv.slice( 2 );
if ( args.length !== 3 ) {
	showHelpAndExit();
}

const mtService = args[ 0 ];
const sourceLang = args[ 1 ];
const targetLang = args[ 2 ];

const sourceHtml = readFileSync( '/dev/stdin', 'utf8' );

if ( sourceHtml.trim() === '' ) {
	showHelpAndExit();
}

if ( !MTClients[ mtService ] ) {
	process.stderr.write( `Cannot find MT service: ${ mtService }` );
	process.exit( 1 );
}

const mt = new MTClients[ mtService ]( cxConfig );

mt.translateHtml(
	sourceLang,
	targetLang,
	sourceHtml
).then( ( targetHtml ) => {
	process.stdout.write( targetHtml + '\n' );
} ).catch( ( error ) => {
	if ( error.stack ) {
		process.stderr.write( error.stack );
	} else {
		process.stderr.write( error );
	}
	process.exit( 2 );
} );
