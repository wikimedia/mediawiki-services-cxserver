import { after, before, describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'fs';
import { each } from 'async';
import { JSDOM } from 'jsdom';
import Adapter from '../../lib/Adapter.js';
import MWApiRequestManager from '../../lib/mw/MWApiRequestManager.js';
import TestClient from '../../lib/mt/TestClient.js';
import TestUtils from '../testutils.js';
import { deepEqual } from '../utils/assert.js';
import { getConfig } from '../../lib/util.js';
import { initApp } from '../../app.js';

import mocks from './MWReference.mocks.json' assert { type: 'json' };
import tests from './MWReference.test.json' assert { type: 'json' };

const dirname = new URL( '.', import.meta.url ).pathname;
describe( 'Reference adaptation', () => {
	let app, api, mocker;

	before( async () => {
		app = await initApp( getConfig() );
		api = new MWApiRequestManager( app );
		mocker = new TestUtils( api );
		mocker.setup( mocks );
	} );

	after( () => {
		mocker.dump( dirname + '/MWReference.mocks.json' );
	} );

	each( tests, ( test, done ) => {
		it( test.desc, () => {
			app.mtClient = new TestClient( app );
			app.reduce = true;
			const adapter = new Adapter( test.from, test.to, api, app );
			if ( typeof test.source === 'string' ) {
				const content = readFileSync( dirname + '/data/' + test.source, 'utf8' );
				const sourceDom = new JSDOM( content );
				const sourceDomAttributes = sourceDom.window.document.querySelector( '[typeof="mw:Extension/ref"]' ).attributes;
				test.source = {
					name: 'span',
					attributes: {
						id: sourceDomAttributes.getNamedItem( 'id' ).value,
						'data-mw': sourceDomAttributes.getNamedItem( 'data-mw' ).value,
						rel: 'dc:references',
						typeof: 'mw:Extension/ref',
						class: 'mw-ref'
					}
				};
			}
			if ( typeof test.result === 'string' ) {
				const resultContent = readFileSync( dirname + '/data/' + test.result, 'utf8' );
				const resultDom = new JSDOM( resultContent );
				const resultsDomAttributes = resultDom.window.document.querySelector( '[typeof="mw:Extension/ref"]' ).attributes;
				test.result = {
					name: 'span',
					attributes: {
						'data-cx': JSON.parse( resultsDomAttributes.getNamedItem( 'data-cx' ).value )
					}
				};
			}
			assert.ok( adapter, 'There is an adapter for references' );
			const translationunit = adapter.getAdapter( test.source );
			assert.ok( translationunit, 'There is an translationunit for content' );

			return translationunit.adapt( test.source ).then( ( adaptedNode ) => {
				const actualDataCX = JSON.parse( adaptedNode.attributes[ 'data-cx' ] );
				const expectedDataCX = test.result.attributes[ 'data-cx' ];
				deepEqual( actualDataCX, expectedDataCX, 'data-cx matches' );

				if ( test.result.attributes[ 'data-mw' ] ) {
					const expectedDataMW = test.result.attributes[ 'data-mw' ];
					const actualDataMW = JSON.parse( adaptedNode.attributes[ 'data-mw' ] );
					deepEqual( actualDataMW, expectedDataMW, 'data-mw matches' );
				}

				done( null );
			} );
		} );
	} );
} );
