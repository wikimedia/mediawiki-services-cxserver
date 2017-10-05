'use strict';

const Adapter = require( '../../lib/Adapter' );
const MWApiRequestManager = require( '../../lib/mw/ApiRequestManager' );
const TestClient = require( '../../lib/mt' ).TestClient;
const assert = require( '../utils/assert' );
const async = require( 'async' );
const cxutil = require( '../../lib/util' );
const server = require( '../utils/server' );
const tests = require( './MWTemplate.test.json' );

describe( 'Template adaptation', () => {
	const config = server.config;
	config.conf.mtClient = new TestClient( config );

	// Mock responses to speed up tests
	// TODO: Move this to data driven approach
	const realGetNamespaceAlias = MWApiRequestManager.prototype.getNamespaceAlias;
	MWApiRequestManager.prototype.getNamespaceAlias = ( name, language ) => {
		const promise = new cxutil.Deferred();
		const data = {
			sl: {
				Template: 'Predloga'
			}
		};

		if ( !data[ language ] || !data[ language ][ name ] ) {
			promise.reject( new Error( `Unexpected query: namespaceAlias:${language}:${name}` ) );
		}

		promise.resolve( data[ language ][ name ] );
		return promise;
	};

	MWApiRequestManager.titlePairCache.fi = {};
	MWApiRequestManager.titlePairCache.fi.sl = {
		get: ( title ) => {
			const promise = new cxutil.Deferred();
			const data = {
				'./Malline:Babel': {
					sourceTitle: 'Malline:Babel',
					targetTitle: 'Predloga:Babilon',
					missing: false
				}
			};

			if ( !data[ title ] ) {
				promise.reject( new Error( `Unexpected query: titlePair:fi:sl:${title}` ) );
			}

			promise.resolve( data[ title ] );
			return promise;
		}
	};

	async.forEach( tests, ( test ) => {
		it( test.desc, () => {
			const adapter = new Adapter( test.from, test.to, server.config );
			const translationunit = adapter.getAdapter( test.source );
			assert.ok( adapter, 'There is an adapter for templates' );

			// Tests store format data-mw as actual JSON, we need to stringify it
			// to make it appear as returned by parsoid
			if ( test.source.attributes[ 'data-mw' ] ) {
				test.source.attributes[ 'data-mw' ] = JSON.stringify( test.source.attributes[ 'data-mw' ] );
			}

			return translationunit.adapt( test.source ).then( ( adaptedNode ) => {
				const actualDataCX = JSON.parse( adaptedNode.attributes[ 'data-cx' ] );
				const expectedDataCX = test.result.attributes[ 'data-cx' ];
				assert.deepEqual( expectedDataCX.adapted, actualDataCX.adapted, 'Adaptation status matches' );

				const actualDataMW = JSON.parse( adaptedNode.attributes[ 'data-mw' ] );
				const expectedDataMW = test.result.attributes[ 'data-mw' ];
				assert.deepEqual( expectedDataMW, actualDataMW, 'data-mw matches' );
			} );
		} );
	} );

	// Cleanup
	MWApiRequestManager.titlePairCache = new Map();
	MWApiRequestManager.prototype.getNamespaceAlias = realGetNamespaceAlias;
} );
