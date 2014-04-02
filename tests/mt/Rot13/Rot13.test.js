'use strict';

QUnit.module( 'Rot13' );
QUnit.test( 'Rot13 tests', function ( assert ) {
	var rot13, tests = require( './Rot13.test.json' );

	rot13 = new CX.Rot13Service();
	QUnit.stop();
	rot13.translate( tests.source ).then( function ( result ) {
		var segmentId;

		for ( segmentId in tests.source ) {
			assert.strictEqual( result[ segmentId ], tests.result[ segmentId ] );
		}
		QUnit.start();
	} );
} );
