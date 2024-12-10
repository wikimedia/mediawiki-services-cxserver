import { after, before, describe, it } from 'node:test';
import { deepEqual, equal, ok } from 'node:assert/strict';
import { each } from 'async';
import { JSDOM } from 'jsdom';
import Adapter from '../../lib/Adapter.js';
import MWApiRequestManager from '../../lib/mw/MWApiRequestManager.js';
import TestClient from '../../lib/mt/TestClient.js';
import TestUtils from '../testutils.js';
import { getConfig } from '../../lib/util.js';
import { initApp } from '../../app.js';
import mocks from './AdaptationTests.mocks.json' assert { type: 'json' };
import tests from './AdaptationTests.json' assert { type: 'json' };

const dirname = new URL( '.', import.meta.url ).pathname;
describe( 'Adaptation tests', () => {
	let app, api, mocker;

	before( async () => {
		app = await initApp( getConfig() );
		api = new MWApiRequestManager( app );
		mocker = new TestUtils( api );
		mocker.setup( mocks );
	} );

	after( () => {
		mocker.dump( dirname + '/AdaptationTests.mocks.json' );
	} );

	each( tests, ( testcase, done ) => {
		it( testcase.desc, () => {

			app.mtClient = new TestClient( app );
			const adapter = new Adapter( testcase.from, testcase.to, api, app );

			return adapter.adapt( testcase.source ).then( ( result ) => {
				const actualDom = new JSDOM( result.getHtml() );

				for ( const id in testcase.resultAttributes ) {
					ok( actualDom.window.document.getElementById( id ), `Element with id ${ id } exists in the result` );
					for ( const attribute in testcase.resultAttributes[ id ] ) {
						const actualAttributeValue = actualDom.window.document
							.getElementById( id ).getAttribute( attribute );
						const expectedAttributeValue = testcase.resultAttributes[ id ][ attribute ];
						if ( attribute === 'text' ) {
							const actualText = actualDom.window.document
								.getElementById( id ).textContent;
							equal(
								actualText,
								testcase.resultAttributes[ id ][ attribute ],
								`Comparing text value for element ${ id }`
							);
						} else if ( typeof expectedAttributeValue === 'object' ) {
							deepEqual(
								JSON.parse( actualAttributeValue ),
								expectedAttributeValue,
								`Comparing attribute ${ attribute } for element ${ id }`
							);
						} else {
							deepEqual(
								actualAttributeValue,
								expectedAttributeValue,
								`Comparing attribute ${ attribute } for element ${ id }`
							);
						}
					}
				}
				done( null );
			} );
		} );
	} );
} );
