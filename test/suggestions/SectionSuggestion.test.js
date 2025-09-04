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

const sectionObjectsData = {
	sections: [
		{ title: 'Etymology', byteoffset: 1000 },
		{ title: 'History', byteoffset: 3500 },
		{ title: 'Playing', byteoffset: 8000 },
		{ title: 'See also', byteoffset: 12000 },
		{ title: 'External links', byteoffset: 13000 },
		{ title: 'References', byteoffset: 14000 }
	],
	pageSize: 20000
};

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

		it( 'should find present and missing sections with sizes when requested', async () => {
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

			SectionSuggester.prototype.getSectionObjectsWithPageSize = ( language ) => {
				if ( language === test.sourceLanguage ) {
					return Promise.resolve( sectionObjectsData );
				}
			};

			const sectionSuggestor = new SectionSuggester(
				api,
				cxConfig.sectionmapping
			);

			const expectedResultWithSizes = {
				...test.expectedResult,
				sourceSectionSizes: {
					__LEAD_SECTION__: 1000,
					Etymology: 2500,
					History: 4500,
					Playing: 4000,
					'See also': 1000,
					'External links': 1000,
					References: 6000
				}
			};

			await sectionSuggestor.getMissingSections( test.sourceLanguage, test.sourceTitle, test.targetLanguage, test.targetTitle, true ).then( ( sections ) => {
				deepEqual( sections, expectedResultWithSizes );
			} );
		} );
	} );
} );
