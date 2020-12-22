'use strict';

const Adapter = require( '../../lib/Adapter' );
const MWApiRequestManager = require( '../../lib/mw/MWApiRequestManager' );
const TestUtils = require( '../testutils' );
const assert = require( '../utils/assert' );
const async = require( 'async' );
const server = require( '../utils/server' );

const mocks = require( './MWLink.mocks.json' );
const tests = require( './MWLink.test.json' );

describe( 'Link Adaptation tests', function () {
	const api = new MWApiRequestManager( server.config );
	const mocker = new TestUtils( api );

	before( function () {
		mocker.setup( mocks );
	} );

	after( function () {
		mocker.dump( __dirname + '/MWLink.mocks.json' );
	} );

	async.each( tests, function ( test, done ) {
		it( test.desc, function () {
			const adapter = new Adapter( test.from, test.to, api, server.config );
			const translationunit = adapter.getAdapter( test.source );

			return translationunit.adapt( test.source ).then( function ( adaptedNode ) {
				for ( const attribute in [ 'href', 'rel', 'title' ] ) {
					assert.deepEqual(
						adaptedNode.attributes[ attribute ],
						test.result.attributes[ attribute ],
						`Attribute ${attribute} matches`
					);
				}

				const expectedDataCX = JSON.parse( adaptedNode.attributes[ 'data-cx' ] );
				const actualDataCX = test.result.attributes[ 'data-cx' ];
				assert.deepEqual(
					expectedDataCX.adapted,
					actualDataCX.adapted,
					'Property adapted of attribute data-cx matches'
				);

				for ( const attribute in [ 'thumbnail', 'pageimage', 'description' ] ) {
					assert.deepEqual(
						actualDataCX.sourceTitle[ attribute ],
						expectedDataCX.sourceTitle[ attribute ],
						`Property sourceTitle.${attribute} of attribute data-cx matches`
					);
				}

				if ( expectedDataCX.adapted ) {
					for ( const attribute in [ 'pageid', 'thumbnail', 'pageimage', 'description' ] ) {
						assert.deepEqual(
							actualDataCX.targetTitle[ attribute ],
							expectedDataCX.targetTitle[ attribute ],
							`Property targetTitle.${attribute} of attribute data-cx matches`
						);
					}
				}
				done( null );
			} );
		} );
	} );
} );
