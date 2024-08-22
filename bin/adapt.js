#!/usr/bin/env node

/* eslint-disable n/no-process-exit */

'use strict';

const { logger } = require( '../lib/logging.js' );
const { getConfig } = require( '../lib/util.js' );
const PrometheusClient = require( '../lib/metric.js' );
const fs = require( 'fs' );
const Adapter = require( __dirname + '/../lib/Adapter' );
const TestClient = require( __dirname + '/../lib/mt' ).TestClient;
const MWApiRequestManager = require( __dirname + '/../lib/mw/MWApiRequestManager' );

const cxConfig = getConfig();
cxConfig.logger = logger(
	cxConfig.name,
	cxConfig.logging
);
cxConfig.metrics = new PrometheusClient( {
	staticLabels: { service: 'cxserver' }
} );

const xhtml = fs.readFileSync( '/dev/stdin', 'utf8' );
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
