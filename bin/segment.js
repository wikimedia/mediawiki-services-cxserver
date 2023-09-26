#!/usr/bin/env node

'use strict';

const fs = require( 'fs' ),
	Segmenter = require( __dirname + '/../lib/segmentation/CXSegmenter' ),
	LinearDoc = require( __dirname + '/../lib/lineardoc' ),
	yaml = require( 'js-yaml' );

function normalize( html ) {
	const normalizer = new LinearDoc.Normalizer();
	normalizer.init();
	normalizer.write( html.replace( /[\t\r\n]+/g, '' ) );
	return normalizer.getHtml();
}

function getParsedDoc( content ) {
	const pageloaderConfig = yaml.load( fs.readFileSync( __dirname + '/../config/MWPageLoader.yaml' ) );
	const parser = new LinearDoc.Parser( new LinearDoc.MwContextualizer(
		{ removableSections: pageloaderConfig.removableSections }
	), {
		wrapSections: true
	} );
	parser.init();
	parser.write( content );
	return parser.builder.doc;
}

const inputHtml = fs.readFileSync( '/dev/stdin', 'utf8' );
if ( inputHtml.trim() === '' ) {
	const script = process.argv[ 1 ];
	process.stderr.write(
		'Usage: node ' + script + ' < file\n' +
		'Input must be wrapped in a block element such as <p>...</p> or <div>..</div>.\n'
	);
	process.exit( 1 );

}
const language = process.argv[ 2 ];
const parsedDoc = getParsedDoc( inputHtml );
const segmenter = new Segmenter();
const segmentedLinearDoc = segmenter.segment( parsedDoc, language );
const result = normalize( segmentedLinearDoc.getHtml() );
process.stdout.write( result + '\n' );
process.stdout.write( '==Categories==\n' );
process.stdout.write( JSON.stringify( parsedDoc.categories, null, 2 ) + '\n' );
