import { describe, it } from 'node:test';
import { fails } from '../utils/assert.js';
import { getConfig } from '../../lib/util.js';
import LingoCloud from '../../lib/mt/LingoCloud.js';

describe( 'LingoCloud machine translation', () => {
	it( 'Should fail because of wrong key ', () => {
		const cxConfig = getConfig();
		cxConfig.mt.LingoCloud.key = 'wrongkey';
		const lingoCloud = new LingoCloud( cxConfig );
		const testSourceContent = 'This is a random english text.';
		fails( lingoCloud.translate( 'en', 'zh', testSourceContent ), ( err ) => {
			if ( err instanceof Error && /value/.test( err ) ) {
				return true;
			}
		} );
	} );
} );
