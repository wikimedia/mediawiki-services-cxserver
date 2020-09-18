'use strict';

/**
 * @external MWApiRequestManager
 */

const sqlite = require( 'sqlite' );

class SectionSuggester {
	/**
	 * @param {MWApiRequestManager} api
	 * @param {string} sectionMappingDatabase Path to the section mapping database
	 */
	constructor( api, sectionMappingDatabase ) {
		this.api = api;
		this.sectionMappingDatabase = sectionMappingDatabase;
		if ( !this.sectionMappingDatabase ) {
			throw new Error( 'Section mapping database is not configured' );
		}
	}

	/**
	 * Get list of sections for the given page. Only top level sections are returned
	 *
	 * @param {string} language Language code
	 * @param {string} title Page title
	 * @return {string[]}
	 */
	async getSections( language, title ) {
		const metadata = await this.api.pageMetadataRequest( language, title );
		if ( !metadata || !metadata.sections ) {
			// Page may not exist.
			return [];
		}
		const headerSections = metadata.sections.filter( ( entry ) => entry.toclevel === 1 ) || [];
		return headerSections.map( ( section ) => section.line );
	}

	/**
	 * Find the section titles mapping from the sqlite database prepared.
	 *
	 * @param {string} sourceLanguage Source language code
	 * @param {string[]} sourceSections Array of source section titles
	 * @param {string} targetLanguage Target language code
	 * @return {Object} Object with key as source section title and value as array of candidate titles in target language.
	 *   This array will be in descending order of frequency. High frequency indicate better suggestion.
	 */
	async getSectionMapping( sourceLanguage, sourceSections, targetLanguage ) {
		const mapping = {};

		const db = await sqlite.open( this.sectionMappingDatabase, { Promise } );
		const query = `SELECT source_title, target_title, frequency
			FROM titles
			WHERE source_language=?
			AND target_language=?
			AND source_title IN (${sourceSections.map( () => '?' )})
			ORDER BY source_title, frequency DESC
		`;
		const results = await db.all( query, [ sourceLanguage, targetLanguage, ...sourceSections ] );
		let maxFrequency = 0;
		// If there is no results, empty array will be returned.
		for ( let i = 0; i < results.length; i++ ) {
			if ( !mapping[ results[ i ].source_title ] ) {
				mapping[ results[ i ].source_title ] = [];
				// First item will have maximum `frequency` as per the above query.
				maxFrequency = results[ i ].frequency;
			}

			const mappingsLength = mapping[ results[ i ].source_title ].length;
			// Reject results that has frequency less than half of max frequency, if we have mapping already.
			// This is to guard against entries in database that are probably typos, or unpopular relative to
			// most recommended translation.
			if ( mappingsLength > 0 && results[ i ].frequency < maxFrequency * 0.5 ) {
				continue;
			}

			mapping[ results[ i ].source_title ].push( results[ i ].target_title );
		}
		return mapping;
	}

	/**
	 * @param {string} sourceLanguage Source language code
	 * @param {string} sourceTitle Source title
	 * @param {string} targetLanguage Target language code
	 * @param {string} targetTitle Target title
	 * @return {Object} Missing sections information with the keys: sourceLanguage, sourceTitle, targetLanguage, targetTitle, present, missing
	 */
	async getMissingSections( sourceLanguage, sourceTitle, targetLanguage, targetTitle ) {
		const missing = {};
		const present = {};
		const sourceSections = await this.getSections( sourceLanguage, sourceTitle );

		const existingTargetSections = await this.getSections( targetLanguage, targetTitle );

		const mapping = await this.getSectionMapping( sourceLanguage, sourceSections, targetLanguage );

		for ( let i = 0; i < sourceSections.length; i++ ) {
			const sourceSectionTitle = sourceSections[ i ];
			const candidateTargetSectionTitles = mapping[ sourceSectionTitle ] || [];
			// candidateTargetSectionTitles will be in decreasing order of frequencies
			for ( let j = 0; j < candidateTargetSectionTitles.length; j++ ) {
				if ( existingTargetSections.indexOf( candidateTargetSectionTitles[ j ] ) >= 0 ) {
					present[ sourceSectionTitle ] = candidateTargetSectionTitles[ j ];
					// Found a matching section in target article.
					break;
				}
			}

			if ( !present[ sourceSectionTitle ] ) {
				if ( candidateTargetSectionTitles.length > 0 ) {
					missing[ sourceSectionTitle ] = candidateTargetSectionTitles[ 0 ];
				} else if ( existingTargetSections.length === 0 ) {
					// There is no sections in target article. So we are 100% sure that this
					// section is missing. Use sourceSectionTitle as fallback suggestion.
					missing[ sourceSectionTitle ] = sourceSectionTitle;
				}
			}
		}

		if ( Object.keys( present ).length === existingTargetSections.length ) {
			// All target sections were mapped to one of the source sections.
			// So, any remaining source section is surely missing in target article.
			for ( let i = 0; i < sourceSections.length; i++ ) {
				const sourceSectionTitle = sourceSections[ i ];
				if ( present[ sourceSectionTitle ] ) {
					continue;
				}
				const candidates = mapping[ sourceSectionTitle ];
				missing[ sourceSections[ i ] ] = candidates && candidates[ 0 ] || sourceSections[ i ];
			}
		}

		return {
			sourceLanguage,
			sourceTitle,
			targetLanguage,
			targetTitle,
			sourceSections,
			targetSections: existingTargetSections,
			present,
			missing
		};
	}
}

module.exports = SectionSuggester;
