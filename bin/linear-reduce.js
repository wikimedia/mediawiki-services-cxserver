#!/usr/bin/env node

/* eslint-disable n/no-process-exit */

import { readFileSync } from 'fs';
import * as LinearDoc from '../lib/lineardoc/index.js';
const html = readFileSync( '/dev/stdin', 'utf8' );
if ( html.trim() === '' ) {
	const script = process.argv[ 1 ];
	process.stderr.write(
		'Usage: node ' + script + ' < file\n' +
		'Input must be wrapped in a block element such as <p>...</p> or <div>..</div>.\n'
	);
	process.exit( 1 );

}

const parser = new LinearDoc.Parser( new LinearDoc.MwContextualizer() );
parser.init();
parser.write( html );
const { reducedDoc, extractedData } = parser.builder.doc.reduce();
process.stdout.write( reducedDoc.getHtml() );
process.stdout.write( '\n== Attributes ==\n' );
process.stdout.write( JSON.stringify( extractedData, null, 2 ) + '\n' );
