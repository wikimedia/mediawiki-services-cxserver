import { describe, it } from 'node:test';
import { fails } from '../utils/assert.js';
import { getConfig } from '../../lib/util.js';
import Google from '../../lib/mt/Google.js';

describe( 'Google machine translation', () => {
	it( 'Should fail because of wrong key ', () => {
		const cxConfig = getConfig();
		cxConfig.mt.Google.key = 'wrongkey';
		const google = new Google( cxConfig );
		const testSourceContent = '<p>This is a <a href="/Test">test</a></p>';
		fails(
			google.translate( 'en', 'ml', testSourceContent ),
			( err ) => {
				if ( ( err instanceof Error ) && /value/.test( err ) ) {
					return true;
				}
			}
		);
	} );
} );
