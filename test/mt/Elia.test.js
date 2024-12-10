import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { fails } from '../utils/assert.js';
import { getConfig } from '../../lib/util.js';
import Elia from '../../lib/mt/Elia.js';

describe( 'Elia machine translation', () => {
	const cxConfig = getConfig();
	cxConfig.mt.Elia.key = 'wrongkey';
	const elia = new Elia( { conf: cxConfig } );
	assert.ok( elia.conf.mt.Elia.api !== undefined, 'Elia API can be read from configuration' );
	it( 'Should fail because of wrong key ', () => {
		const testSourceContent = '<p>Esta es una <a href="/prueba">prueba</a></p>';
		fails(
			elia.translate( 'es', 'eu', testSourceContent ),
			( err ) => {
				if ( ( err instanceof Error ) && /value/.test( err ) ) {
					return true;
				}
			}
		);
	} );
} );
