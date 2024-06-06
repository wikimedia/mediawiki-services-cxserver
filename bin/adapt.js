#!/usr/bin/env node

'use strict';

const fs = require( 'fs' ),
	yaml = require( 'js-yaml' ),
	Adapter = require( __dirname + '/../lib/Adapter' ),
	TestClient = require( __dirname + '/../lib/mt' ).TestClient,
	MWApiRequestManager = require( __dirname + '/../lib/mw/MWApiRequestManager' );

const config = yaml.load( fs.readFileSync( 'config.yaml' ) );
if ( !config ) {
	process.stdout.write( 'Failed to load config' );
	process.exit( 1 );
}

const cxConfig = config.services && Array.isArray( config.services ) &&
		config.services.filter( ( item ) => item && item.name === 'cxserver' )[ 0 ];
if ( !cxConfig ) {
	process.stdout.write( 'Cannot find cxserver config' );
	process.exit( 1 );
}

const xhtml = fs.readFileSync( '/dev/stdin', 'utf8' );
if ( xhtml.trim() === '' || process.argv.length !== 4 ) {
	const script = process.argv[ 1 ];
	process.stderr.write(
		'Usage: node ' + script + ' fromLang toLang < file\n'
	);
	process.exit( 1 );

}

cxConfig.conf.mtClient = new TestClient( cxConfig );

const from = process.argv[ 2 ];
const to = process.argv[ 3 ];
const api = new MWApiRequestManager( cxConfig );
const adapter = new Adapter( from, to, api, cxConfig );
adapter.adapt( xhtml ).then( ( result ) => {
	process.stdout.write( result.getHtml() + '\n' );
} );
