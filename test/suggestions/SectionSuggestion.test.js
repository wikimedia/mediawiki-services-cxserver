import { describe, it } from 'node:test';
import { forEach } from 'async';
import { deepEqual } from '../utils/assert.js';
import { getConfig } from '../../lib/util.js';
import SectionSuggester from '../../lib/suggestion/SectionSuggester.js';
import MWApiRequestManager from '../../lib/mw/MWApiRequestManager.js';

const tests = [
	{
		sourceLanguage: 'en',
		targetLanguage: 'ml',
		sourceTitle: 'Sitar',
		targetTitle: 'സിത്താർ',
		sourceSections: [
			'Etymology',
			'History',
			'Playing',
			'See also',
			'External links',
			'References'
		],
		targetSections: [
			'അവലംബം'
		],
		expectedResult: {
			sourceLanguage: 'en',
			sourceTitle: 'Sitar',
			targetLanguage: 'ml',
			targetTitle: 'സിത്താർ',
			sourceSections: [
				'Etymology',
				'History',
				'Playing',
				'See also',
				'External links',
				'References'
			],
			targetSections: [
				'അവലംബം'
			],
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

describe( 'SectionSuggester tests', () => {
	forEach( tests, ( test ) => {
		it( 'should find present and missing sections', async () => {
			const cxConfig = getConfig();

			const api = new MWApiRequestManager( cxConfig );
			SectionSuggester.prototype.getSections = ( language ) => {
				if ( language === test.sourceLanguage ) {
					return Promise.resolve( test.sourceSections );
				}
				if ( language === test.targetLanguage ) {
					return Promise.resolve( test.targetSections );
				}
			};

			const sectionSuggestor = new SectionSuggester(
				api,
				cxConfig.sectionmapping
			);

			await sectionSuggestor.getMissingSections( test.sourceLanguage, test.sourceTitle, test.targetLanguage, test.targetTitle ).then( ( sections ) => {
				deepEqual( sections, test.expectedResult );
			} );
		} );
	} );
} );
