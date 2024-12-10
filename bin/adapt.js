#!/usr/bin/env node

/* eslint-disable n/no-process-exit */

import { readFileSync } from 'fs';
import { logger } from '../lib/logging.js';
import Adapter from '../lib/Adapter.js';
import PrometheusClient from '../lib/metric.js';
import MWApiRequestManager from '../lib/mw/MWApiRequestManager.js';
import TestClient from '../lib/mt/TestClient.js';
import { getConfig } from '../lib/util.js';

const cxConfig = getConfig();
cxConfig.logger = logger(
	cxConfig.name,
	cxConfig.logging
);
cxConfig.metrics = new PrometheusClient( {
	staticLabels: { service: 'cxserver' }
} );

const xhtml = readFileSync( '/dev/stdin', 'utf8' );
if ( xhtml.trim() === '' || process.argv.length !== 4 ) {
	const script = process.argv[ 1 ];
	process.stderr.write(
		'Usage: node ' + script + ' fromLang toLang < file\n'
	);
	process.exit( 1 );

}

cxConfig.mtClient = new TestClient( cxConfig );

const from = process.argv[ 2 ];
const to = process.argv[ 3 ];
const api = new MWApiRequestManager( cxConfig );
const adapter = new Adapter( from, to, api, cxConfig );
adapter.adapt( xhtml ).then( ( result ) => {
	process.stdout.write( result.getHtml() + '\n' );
} );
