'use strict';

const assert = require( '../utils/assert.js' ),
	server = require( '../utils/server.js' ),
	async = require( 'async' ),
	Apertium = require( '../../lib/mt' ).Apertium,
	Adapter = require( '../../lib/Adapter' ),
	tests = require( './AdaptationTests.json' );

describe( 'Adaptation tests', () => {
	async.forEach( tests, ( test ) => {
		let adapter, cxserver;

		cxserver = server.config.conf.services[ server.config.conf.services.length - 1 ];
		cxserver.conf.mtClient = new Apertium( cxserver );
		adapter = new Adapter( test.from, test.to, cxserver );
		it( 'should not have any errors when: ' + test.desc, () => {
			return adapter.adapt( test.source ).then( ( result ) => {
				assert.ok( result.getHtml().length > 0 );
			} );
		} );
	} );
} );
