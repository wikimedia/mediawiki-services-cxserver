'use strict';

const assert = require( '../utils/assert.js' ),
	server = require( '../utils/server.js' ),
	async = require( 'async' ),
	Adapter = require( '../../lib/Adapter' ),
	TestClient = require( '../../lib/mt' ).TestClient,
	tests = require( './MWReference.test.json' );

describe( 'Reference adaptation', () => {
	let config = server.config;
	config.conf.mtClient = new TestClient( config );

	async.forEach( tests, ( test ) => {
		it( test.desc, () => {
			const adapter = new Adapter( test.from, test.to, server.config );
			const translationunit = adapter.getAdapter( test.source );

			assert.ok( adapter, 'There is an adapter for references' );

			return translationunit.adapt( test.source ).then( ( adaptedNode ) => {
				const expectedDataCX = JSON.parse( adaptedNode.attributes[ 'data-cx' ] );
				const actualDataCX = test.result.attributes[ 'data-cx' ];
				assert.deepEqual( expectedDataCX, actualDataCX, 'data-cx matches' );

				const expectedDataMW = JSON.parse( adaptedNode.attributes[ 'data-mw' ] );
				const actualDataMW = test.result.attributes[ 'data-mw' ];
				assert.deepEqual( expectedDataMW, actualDataMW, 'data-mw matches' );

			} );
		} );
	} );
} );
