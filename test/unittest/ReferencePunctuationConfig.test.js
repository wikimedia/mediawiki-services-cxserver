import { before, describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { getConfig } from '../../lib/util.js';
import { initApp } from '../../app.js';

describe( 'Reference punctuation policy configuration', () => {
	let registry;

	before( async () => {
		const app = await initApp( getConfig() );
		registry = app.registry;
	} );

	it( 'returns "before" policy for a configured language', () => {
		const policy = registry.getReferencePunctuationPolicy( 'fr' );
		assert.equal( policy.policy, 'before' );
		assert.ok( policy.punctuation.includes( '.' ) );
	} );

	it( 'returns "after" policy for an unlisted language', () => {
		assert.equal( registry.getReferencePunctuationPolicy( 'en' ).policy, 'after' );
	} );
} );
