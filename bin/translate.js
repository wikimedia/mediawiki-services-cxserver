#!/usr/bin/env node

/* eslint-disable n/no-process-exit */

import { readFileSync } from 'fs';
import { logger } from '../lib/logging.js';
import { getConfig } from '../lib/util.js';

import Adapter from '../lib/Adapter.js';
import * as MTClients from '../lib/mt/index.js';
import MWApiRequestManager from '../lib/mw/MWApiRequestManager.js';
import PrometheusClient from '../lib/metric.js';

const cxConfig = getConfig();
cxConfig.logger = logger(
	cxConfig.name,
	cxConfig.logging
);
cxConfig.metrics = new PrometheusClient( {
	staticLabels: { service: 'cxserver' }
} );

const sourceHtml = readFileSync( '/dev/stdin', 'utf8' );
if ( sourceHtml.trim() === '' || process.argv.length !== 5 ) {
	const script = process.argv[ 1 ];
	process.stderr.write(
		`Usage: node ${ script } Apertium fromLang toLang < file\n`
	);
	process.exit( 1 );

}

const mtService = process.argv[ 2 ];
const sourceLang = process.argv[ 3 ];
const targetLang = process.argv[ 4 ];

if ( !MTClients[ mtService ] ) {
	process.stderr.write( `Cannot find MT service: ${ mtService }` );
	process.exit( 1 );
}

const mt = new MTClients[ mtService ]( cxConfig );
cxConfig.mtClient = mt;

mt.translate(
	sourceLang,
	targetLang,
	sourceHtml
).then( ( targetHtml ) => {
	const api = new MWApiRequestManager( cxConfig );
	const adapter = new Adapter( sourceLang, targetLang, api, cxConfig );
	adapter.adapt( targetHtml ).then( ( result ) => {
		process.stdout.write( result.getHtml() + '\n' );
	} );
} );
