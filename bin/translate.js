#!/usr/bin/env node

'use strict';

const fs = require( 'fs' ),
	yaml = require( 'js-yaml' ),
	Adapter = require( __dirname + '/../lib/Adapter' ),
	MTClients = require( __dirname + '/../lib/mt/' ),
	MWApiRequestManager = require( __dirname + '/../lib/mw/MWApiRequestManager' );

const config = yaml.load( fs.readFileSync( __dirname + '/../config.yaml' ) );

if ( !config ) {
	process.stdout.write( 'Failed to load config' );
	process.exit( 1 );
}

const cxConfig = config.services && Array.isArray( config.services ) &&
	config.services.find( ( item ) => item && item.name === 'cxserver' );

if ( !cxConfig ) {
	process.stdout.write( 'Cannot find cxserver config' );
	process.exit( 1 );
}

cxConfig.logger = { log: console.log };
cxConfig.metrics = {
	makeMetric: () => ( { increment: console.log } )
};

const sourceHtml = fs.readFileSync( '/dev/stdin', 'utf8' );
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
cxConfig.conf.mtClient = mt;

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
