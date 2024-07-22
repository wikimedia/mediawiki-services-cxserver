'use strict';

// mocha defines to avoid JSHint breakage

const fs = require( 'fs' );
const yaml = require( 'js-yaml' );

const config = yaml.load( fs.readFileSync( `${ __dirname }/../../config.dev.yaml` ) );
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

const testLogger = { log: console.log, child: () => testLogger };

const options = {
	config: cxConfig.conf,
	logger: testLogger,
	metrics: { increment: console.log, getServiceLabel: () => 'test' }
};

module.exports = { options, config: cxConfig };
