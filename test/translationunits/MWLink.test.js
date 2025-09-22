import { after, before, describe, it } from 'node:test';
import { each } from 'async';
import Adapter from '../../lib/Adapter.js';
import MWApiRequestManager from '../../lib/mw/MWApiRequestManager.js';
import TestUtils from '../testutils.js';
import { deepEqual } from '../utils/assert.js';
import { getConfig } from '../../lib/util.js';
import { initApp } from '../../app.js';

import mocks from './MWLink.mocks.json' with { type: 'json' };
import tests from './MWLink.test.json' with { type: 'json' };

const dirname = new URL( '.', import.meta.url ).pathname;
describe( 'Link Adaptation tests', () => {
	let app, api, mocker;

	before( async () => {
		app = await initApp( getConfig() );
		api = new MWApiRequestManager( app );
		mocker = new TestUtils( api );
		mocker.setup( mocks );
	} );

	after( () => {
		mocker.dump( dirname + '/MWLink.mocks.json' );
	} );

	each( tests, ( test, done ) => {
		it( test.desc, () => {
			const adapter = new Adapter( test.from, test.to, api, app );
			const translationunit = adapter.getAdapter( test.source );

			deepEqual( !!adapter.logger, true, 'Logger is set' );
			return translationunit.adapt( test.source ).then( ( adaptedNode ) => {
				for ( const attribute in [ 'href', 'rel', 'title' ] ) {
					deepEqual(
						adaptedNode.attributes[ attribute ],
						test.result.attributes[ attribute ],
						`Attribute ${ attribute } matches`
					);
				}

				const expectedDataCX = JSON.parse( adaptedNode.attributes[ 'data-cx' ] );
				const actualDataCX = test.result.attributes[ 'data-cx' ];
				deepEqual(
					expectedDataCX.adapted,
					actualDataCX.adapted,
					'Property adapted of attribute data-cx matches'
				);

				for ( const attribute in [ 'thumbnail', 'pageimage', 'description' ] ) {
					deepEqual(
						actualDataCX.sourceTitle[ attribute ],
						expectedDataCX.sourceTitle[ attribute ],
						`Property sourceTitle.${ attribute } of attribute data-cx matches`
					);
				}

				if ( expectedDataCX.adapted ) {
					for ( const attribute in [
						'pageid',
						'thumbnail',
						'pageimage',
						'description'
					] ) {
						deepEqual(
							actualDataCX.targetTitle[ attribute ],
							expectedDataCX.targetTitle[ attribute ],
							`Property targetTitle.${ attribute } of attribute data-cx matches`
						);
					}
				}
				done( null );
			} );
		} );
	} );
} );
