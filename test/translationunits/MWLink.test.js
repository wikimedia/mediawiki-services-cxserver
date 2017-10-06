'use strict';

const Adapter = require( '../../lib/Adapter' );
const MWApiRequestManager = require( '../../lib/mw/ApiRequestManager' );
const TestUtils = require( '../testutils' );
const assert = require( '../utils/assert' );
const async = require( 'async' );
const server = require( '../utils/server' );

const mocks = require( './MWLink.mocks.json' );
const tests = require( './MWLink.test.json' );

describe( 'Link Adaptation tests', function () {
	const api = new MWApiRequestManager( server.config );
	const mocker = new TestUtils( api );
	mocker.setup( mocks );

	async.each( tests, function ( test, done ) {
		it( 'should not have any errors when: ' + test.desc, function () {
			var translationunit, adapter;

			adapter = new Adapter( test.from, test.to, api, server.config );
			translationunit = adapter.getAdapter( test.source );
			return translationunit.adapt( test.source ).then( function ( adaptedNode ) {
				let expectedDataCX, actualDataCX;
				assert.deepEqual( adaptedNode.attributes.href, test.result.attributes.href );
				assert.deepEqual( adaptedNode.attributes.rel, test.result.attributes.rel );
				assert.deepEqual( adaptedNode.attributes.title, test.result.attributes.title );
				expectedDataCX = JSON.parse( adaptedNode.attributes[ 'data-cx' ] );
				actualDataCX = test.result.attributes[ 'data-cx' ];
				assert.deepEqual( expectedDataCX.adapted, actualDataCX.adapted );
				assert.deepEqual( !!actualDataCX.sourceTitle.thumbnail, !!expectedDataCX.sourceTitle.thumbnail );
				assert.deepEqual( !!actualDataCX.sourceTitle.pageimage, !!expectedDataCX.sourceTitle.pageimage );
				assert.ok( !!actualDataCX.sourceTitle.terms, !!expectedDataCX.sourceTitle.terms );
				if ( expectedDataCX.adapted ) {
					assert.deepEqual( expectedDataCX.targetTitle.pageid, actualDataCX.targetTitle.pageid );
					assert.deepEqual( !!actualDataCX.targetTitle.thumbnail, !!expectedDataCX.targetTitle.thumbnail );
					assert.deepEqual( !!actualDataCX.targetTitle.pageimage, !!expectedDataCX.targetTitle.pageimage );
					assert.deepEqual( !!actualDataCX.targetTitle.terms, !!expectedDataCX.targetTitle.terms );
				}
				done( null );
			} );
		} );
	}, mocker.dump.bind( mocker, 'test/translationunits/MWLink.mocks.json' ) );
} );
