import { describe, it } from 'node:test';
import { forEach } from 'async';
import { deepEqual } from '../utils/assert.js';
import { getConfig } from '../../lib/util.js';
import SectionSuggester from '../../lib/suggestion/SectionSuggester.js';
import MWApiRequestManager from '../../lib/mw/MWApiRequestManager.js';

const tests = [
	{
		expectedResult: {
			present: {
				References: 'അവലംബം'
			},
			missing: {
				Etymology: 'പേരിന്റെ ഉത്ഭവം',
				History: 'ചരിത്രം',
				Playing: 'വായിക്കുന്ന രീതി',
				'See also': 'ഇതും കാണുക',
				'External links': 'പുറം കണ്ണികൾ'
			}
		}
	}
];

const testSourceLanguage = 'en';
const testTargetLanguage = 'ml';
const testSourceTitle = 'Sitar';
const testSourceSections = [
	'Etymology',
	'History',
	'Playing',
	'See also',
	'External links',
	'References'
];
const testTargetSections = [
	'അവലംബം'
];

describe( 'SectionSuggester tests', () => {
	forEach( tests, ( test ) => {
		it( 'should find present and missing sections', async () => {
			const cxConfig = getConfig();

			const api = new MWApiRequestManager( cxConfig );

			const sectionSuggester = new SectionSuggester(
				api,
				cxConfig.sectionmapping
			);

			await sectionSuggester.getPresentAndMissingSections(
				testSourceLanguage,
				testSourceTitle,
				testTargetLanguage,
				testSourceSections,
				testTargetSections
			).then( ( sections ) => {
				deepEqual( sections, test.expectedResult );
			} );
		} );
	} );
} );
