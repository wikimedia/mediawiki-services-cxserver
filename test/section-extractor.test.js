import { describe, it } from 'node:test';

import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { forEach } from 'async';
import { extractSections, extractSectionsWithSizes } from '../lib/section-extractor.js';
import { deepEqual } from './utils/assert.js';

const currentFilename = fileURLToPath( import.meta.url );
const currentDirname = dirname( currentFilename );

// Helper to load fixture files
// eslint-disable-next-line security/detect-non-literal-fs-filename
const loadWikitextSample = ( filename ) => readFileSync( join( currentDirname, 'wikitext-samples', filename ), 'utf-8' );

const tests = [
	{
		pageTitle: 'Moon',
		sections: [
			{ title: '__LEAD_SECTION__', size: 14711 },
			{ title: 'Names and etymology', size: 3620 },
			{ title: 'Natural history', size: 17009 },
			{ title: 'Physical characteristics', size: 76050 },
			{ title: 'Earth–Moon system', size: 17571 },
			{ title: 'Orientation and appearance', size: 22933 },
			{ title: 'History of exploration and human presence', size: 40164 },
			{ title: 'Human presence', size: 19791 },
			{ title: 'Legal status', size: 10208 },
			{ title: 'In culture and life', size: 23412 },
			{ title: 'See also', size: 99 },
			{ title: 'Explanatory notes', size: 3761 },
			{ title: 'References', size: 27715 },
			{ title: 'Further reading', size: 5544 },
			{ title: 'External links', size: 2024 }
		]
	},
	{
		pageTitle: 'Tiger',
		sections: [
			{ title: '__LEAD_SECTION__', size: 5089 },
			{ title: 'Etymology', size: 1741 },
			{ title: 'Taxonomy', size: 31212 },
			{ title: 'Description', size: 10439 },
			{ title: 'Distribution and habitat', size: 8696 },
			{ title: 'Behaviour and ecology', size: 37711 },
			{ title: 'Threats', size: 16598 },
			{ title: 'Conservation', size: 21321 },
			{ title: 'Relationship with humans', size: 16954 },
			{ title: 'See also', size: 89 },
			{ title: 'References', size: 2268 },
			{ title: 'External links', size: 1357 }
		]
	}

];

describe( 'Section extractor tests', () => {
	forEach( tests, ( test ) => {
		it( 'should extract section titles correctly', async () => {
			const wikitext = loadWikitextSample( test.pageTitle );

			const expectedSectionTitles = test.sections.map( ( s ) => s.title ).slice( 1 );
			deepEqual( extractSections( wikitext ), expectedSectionTitles );
		} );

		it( 'should extract section sizes correctly', async () => {
			const wikitext = loadWikitextSample( test.pageTitle );

			const result = extractSectionsWithSizes( wikitext );
			deepEqual( result, test.sections );
		} );
	} );
} );
