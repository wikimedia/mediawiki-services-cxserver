#!/usr/bin/env node

'use strict';

const fs = require( 'fs' ),
	LinearDoc = require( __dirname + '/../lib/lineardoc' );

const xhtml = fs.readFileSync( '/dev/stdin', 'utf8' );
if ( xhtml.trim() === '' ) {
	const script = process.argv[ 1 ];
	process.stderr.write(
		'Usage: node ' + script + ' < file\n' +
		'Input must be wrapped in a block element such as <p>...</p> or <div>..</div>.\n'
	);
	process.exit( 1 );
}

const parser = new LinearDoc.Parser( new LinearDoc.MwContextualizer() );
parser.init();
parser.write( xhtml );
process.stdout.write( parser.builder.doc.dumpXml() );
