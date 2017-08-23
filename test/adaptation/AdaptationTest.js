'use strict';

var assert = require( '../utils/assert.js' ),
	server = require( '../utils/server.js' ),
	LinearDoc = require( '../../lib/lineardoc' ),
	async = require( 'async' ),
	Apertium = require( '../../lib/mt' ).Apertium,
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
		var expectedResultData, adapter, cxserver;

		cxserver = server.config.conf.services[ server.config.conf.services.length - 1 ];
		cxserver.conf.mtClient = new Apertium( cxserver );
		adapter = new Adapter( test.from, test.to, cxserver );
		it( 'should not have any errors when: ' + test.desc, function () {
			return adapter.adapt( test.source ).then( ( result ) => {
				result = normalize( result.getHtml() );
				expectedResultData = normalize( test.result );
				assert.deepEqual( result, expectedResultData, test.source + ': ' + test.desc || '' );
			} );
		} );
	} );

} );
