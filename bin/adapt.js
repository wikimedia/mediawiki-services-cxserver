/* eslint-disable n/no-process-exit */

import { readFileSync } from 'fs';
import { logger } from '../lib/logging.js';
import Adapter from '../lib/Adapter.js';
import PrometheusClient from '../lib/metric.js';
import MWApiRequestManager from '../lib/mw/MWApiRequestManager.js';
import TestClient from '../lib/mt/TestClient.js';
import { getConfig } from '../lib/util.js';

const cxConfig = getConfig( './config.yaml' );

const xhtml = readFileSync( '/dev/stdin', 'utf8' );
if ( xhtml.trim() === '' || process.argv.length !== 4 ) {
	const script = process.argv[ 1 ];
	process.stderr.write(
		'Usage: node ' + script + ' fromLang toLang < file\n'
	);
	process.exit( 1 );

}

const app = {
	conf: cxConfig,
	logger: logger( cxConfig.name, cxConfig.logging ),
	metrics: new PrometheusClient( { staticLabels: { service: 'cxserver' } } )
};
app.mtClient = new TestClient( app );

const from = process.argv[ 2 ];
const to = process.argv[ 3 ];
const api = new MWApiRequestManager( app );
const adapter = new Adapter( from, to, api, app );
adapter.adapt( xhtml ).then( ( result ) => {
	process.stdout.write( result.getHtml() + '\n' );
} );
