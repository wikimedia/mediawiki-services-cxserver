import { describe, it } from 'node:test';
import { deepEqual } from 'node:assert/strict';
import { each } from 'async';
import TransformLanguages from '../../config/transform.js';

describe( 'Config transform tests', () => {
	const cases = [
		{
			description: 'Simple cross product of languages',
			input: {
				languages: [
					'af',
					'ca',
					'fr'
				]
			},
			output: {
				af: [ 'ca', 'fr' ],
				ca: [ 'af', 'fr' ],
				fr: [ 'af', 'ca' ]
			}
		},
		{
			description: 'Do not translate between two variants of English',
			input: {
				languages: [
					'af',
					'en',
					'simple'
				]
			},
			output: {
				af: [ 'en', 'simple' ],
				en: [ 'af' ],
				simple: [ 'af' ]
			}
		},
		{
			description: 'Exclude "notAsTarget" languages',
			input: {
				languages: [
					'af',
					'ca',
					'fr'
				],
				notAsTarget: [ 'ca' ]
			},
			output: {
				af: [ 'fr' ],
				ca: [ 'af', 'fr' ],
				fr: [ 'af' ]
			}
		},
		{
			description: 'Handle pairs in the configuration',
			input: {
				languages: [
					'en',
					'ig',
					'tum',
					'sat'
				],
				pairs: {
					en: [ 'bcl' ]
				}
			},
			output: {
				en: [
					'bcl',
					'ig',
					'tum',
					'sat'
				],
				ig: [
					'en',
					'tum',
					'sat'
				],
				sat: [
					'en',
					'ig',
					'tum'
				],
				tum: [
					'en',
					'ig',
					'sat'
				]

			}
		}
	];

	each( cases, ( testcase, done ) => {
		it( testcase.description, () => {
			const handler = new TransformLanguages( testcase.input );
			deepEqual( handler.languages, testcase.output );
			done();
		} );
	} );
} );
