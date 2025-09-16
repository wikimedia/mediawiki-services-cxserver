#!/usr/bin/env node

/* eslint-disable n/no-process-exit */

import { readFileSync } from 'fs';
import { Parser, MwContextualizer } from '../lib/lineardoc/index.js';

const xhtml = readFileSync( '/dev/stdin', 'utf8' );
if ( xhtml.trim() === '' ) {
	const script = process.argv[ 1 ];
	process.stderr.write(
		'Usage: node ' +
      script +
      ' < file\n' +
      'Input must be wrapped in a block element such as <p>...</p> or <div>..</div>.\n'
	);
	process.exit( 1 );
}

const parser = new Parser( new MwContextualizer() );
parser.init();
parser.write( xhtml );
const doc = parser.builder.doc.wrapSections();
process.stdout.write( doc.dumpXml() );
