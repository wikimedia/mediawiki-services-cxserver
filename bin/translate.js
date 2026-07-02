/* eslint-disable n/no-process-exit */

import { readFileSync } from 'fs';
import { logger } from '../lib/logging.js';
import { getConfig } from '../lib/util.js';

import Adapter from '../lib/Adapter.js';
import * as MTClients from '../lib/mt/index.js';
import MWApiRequestManager from '../lib/mw/MWApiRequestManager.js';
import PrometheusClient from '../lib/metric.js';

const sourceHtml = readFileSync( '/dev/stdin', 'utf8' );
if ( sourceHtml.trim() === '' || process.argv.length !== 5 ) {
	const script = process.argv[ 1 ];
	process.stderr.write(
		`Usage: node ${ script } MTService fromLang toLang < file\n`
	);
	process.exit( 1 );

}

const mtService = process.argv[ 2 ];
const sourceLang = process.argv[ 3 ];
const targetLang = process.argv[ 4 ];

const cxConfig = getConfig( './config.yaml' );

if ( !MTClients[ mtService ] ) {
	process.stderr.write( `Cannot find MT service: ${ mtService }` );
	process.exit( 1 );
}

const app = {
	conf: cxConfig,
	logger: logger( cxConfig.name, cxConfig.logging ),
	metrics: new PrometheusClient( { staticLabels: { service: 'cxserver' } } )
};
app.mtClient = new MTClients[ mtService ]( app );

app.mtClient.translate(
	sourceLang,
	targetLang,
	sourceHtml
).then( ( targetHtml ) => {
	const api = new MWApiRequestManager( app );
	const adapter = new Adapter( sourceLang, targetLang, api, app );
	adapter.adapt( targetHtml ).then( ( result ) => {
		process.stdout.write( result.getHtml() + '\n' );
	} );
} );
