'use strict';

var assert = require( '../utils/assert.js' ),
	server = require( '../utils/server.js' ),
	LinearDoc = require( '../../lib/lineardoc' ),
	async = require( 'async' ),
	Adapter = require( '../../lib/Adapter' ),
	tests = require( './AdaptationTests.json' );

function normalize( html ) {
	var normalizer = new LinearDoc.Normalizer();
	normalizer.init();
	normalizer.write( html.replace( /(\r\n|\n|\t|\r)/gm, '' ) );
	return normalizer.getHtml();
}

describe( 'Adaptation tests', function () {
	async.forEach( tests, function ( test ) {
		var expectedResultData, adapter;

		adapter = new Adapter( test.from, test.to, server.config );
		it( 'should not have any errors when: ' + test.desc, function () {
			return adapter.adapt( test.source ).then( function( result ) {
				result = normalize( result.getHtml() );
				expectedResultData = normalize( test.result );
				assert.deepEqual( result, expectedResultData, test.source + ': ' + test.desc || '' );
			} );
		} );
	} );

} );
