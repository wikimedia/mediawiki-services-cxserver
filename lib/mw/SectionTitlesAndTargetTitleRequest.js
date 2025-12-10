/**
 * ContentTranslation Section Titles and Target Title request (optionally with section sizes)
 */
import { extractSections, extractSectionsWithSizes } from '../section-extractor.js';
import BatchedAPIRequest from './BatchedAPIRequest.js';

/**
 * Fetches information about title pairs in batches.
 *
 * @class
 * @extends BatchedAPIRequest
 * @constructor
 * @param {Object} config Configuration
 */
class SectionTitlesAndTargetTitleRequest extends BatchedAPIRequest {

	constructor( config ) {
		super( config );
		this.includeSectionSizes = config.includeSectionSizes;
	}

	processResponse( response ) {
		return response.query;
	}

	processPage( page ) {
		const targetTitle = page.langlinks?.[ 0 ]?.title;
		const content = page.revisions?.[ 0 ]?.slots?.main?.content;

		if ( !content ) {
			return { targetTitle, sections: [] };
		}

		let sectionSizes = null;
		let sectionTitles;
		if ( !this.includeSectionSizes ) {
			sectionTitles = extractSections( content );
		} else {
			const sections = extractSectionsWithSizes( content );
			const sectionsWithoutLead = sections.slice( 1 );
			sectionTitles = sectionsWithoutLead.map( ( section ) => section.title );
			sectionSizes = sections.reduce( ( sizes, section ) => {
				sizes[ section.title ] = section.size;
				return sizes;
			}, {} );
		}

		return { targetTitle, sectionTitles, sectionSizes };
	}

	getRequestPromise( subqueue ) {
		const query = {
			action: 'query',
			prop: 'revisions|langlinks',
			rvprop: 'content',
			rvslots: 'main',
			lllimit: subqueue.length,
			lllang: this.getLllangParam( this.targetLanguage ),
			format: 'json',
			formatversion: '2',
			titles: subqueue.join( '|' ),
			redirects: true,
			continue: ''
		};
		const domain = this.getDomain( this.sourceLanguage );

		return this.mwPost( domain, query );
	}
}

export default SectionTitlesAndTargetTitleRequest;
