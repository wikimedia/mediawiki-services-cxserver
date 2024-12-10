import { before, describe, it } from 'node:test';
import { readFileSync } from 'fs';
import { each } from 'async';
import { deepEqual } from '../utils/assert.js';
import { getConfig } from '../../lib/util.js';
import { Normalizer } from '../../lib/lineardoc/index.js';
import MWPageLoader from '../../lib/mw/MWPageLoader.js';
import { initApp } from '../../app.js';

const dirname = new URL( '.', import.meta.url ).pathname;
function normalize( html ) {
	const normalizer = new Normalizer();
	normalizer.init();
	normalizer.write( html.replace( /[\t\r\n]+/gm, '' ) );
	return normalizer.getHtml();
}

const tests = [
	{
		desc: 'Add data-section-number attribute to every CX section',
		source: 'test-data-section-number.html',
		sourceLanguage: 'en',
		targetLanguage: 'es',
		result: 'result-data-section-number.html'
	}
];
describe( 'MWPageLoader tests', () => {
	let app;
	before( async () => {
		app = await initApp( getConfig() );
	} );

	each( tests, ( test ) => {
		it( 'Test: ' + test.desc, () => {
			// Fake the actual MWPageLoader fetch call
			MWPageLoader.prototype.fetch = () => {
				const sourceContent = readFileSync( dirname + '/data/' + test.source, 'utf8' );
				return Promise.resolve( { body: sourceContent } );
			};
			const pageloader = new MWPageLoader( {
				context: app,
				sourceLanguage: test.sourceLanguage,
				targetLanguage: test.targetLanguage
			} );
			const expectedResultData = normalize(
				readFileSync( dirname + '/data/' + test.result, 'utf8' )
			);
			return pageloader.getPage( 'mockPage', null, true ).then( ( processedPageContent ) => {
				deepEqual( normalize( processedPageContent.content ), expectedResultData, test.desc );
			} );
		} );
	} );
} );
