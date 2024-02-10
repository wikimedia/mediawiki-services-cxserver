'use strict';

/**
 * @external MWApiRequestManager
 */

const sqlite = require( 'sqlite' );
const sqlite3 = require( 'sqlite3' );
const mysql = require( 'mysql' );
const util = require( 'util' );

class SectionSuggester {
	/**
	 * @param {MWApiRequestManager} api
	 * @param {string} sectionMappingDatabaseConf Database configuration
	 */
	constructor( api, sectionMappingDatabaseConf ) {
		this.api = api;
		this.sectionMappingDatabaseConf = sectionMappingDatabaseConf;
		if ( !this.sectionMappingDatabaseConf ) {
			throw new Error( 'Section mapping database is not configured' );
		}
	}

	/**
	 * @param {string} sourceLanguage Language code
	 * @param {string} targetLanguage Page title
	 * @param {string[]} sourceSections
	 * @return {Promise<{source_title: string, target_title: string, frequency: number}[]>}
	 */
	async querySectionMapping( sourceLanguage, targetLanguage, sourceSections ) {
		if ( this.sectionMappingDatabaseConf.type === 'mysql' ) {
			const connection = mysql.createConnection( {
				host: this.sectionMappingDatabaseConf.host,
				user: this.sectionMappingDatabaseConf.user,
				password: this.sectionMappingDatabaseConf.password,
				database: this.sectionMappingDatabaseConf.database
			} );
			connection.connect( ( err ) => {
				if ( err !== null ) {
					throw new Error( 'Could not connect to section mapping database' + err.stack );
				}
			} );

			const query = util.promisify( connection.query ).bind( connection );
			const queryStr = `SELECT source_title, target_title, frequency
				FROM titles
				WHERE source_language=?
				AND target_language=?
				AND source_title IN (${ sourceSections.map( () => '?' ).join( ',' ) })
				ORDER BY source_title, frequency DESC
			`;
			try {
				const results = await query( queryStr, [ sourceLanguage, targetLanguage, ...sourceSections ] );
				for ( let i = 0; i < results.length; i++ ) {
					// For blob types, convert to string.
					if ( Buffer.isBuffer( results[ i ].source_title ) ) {
						// eslint-disable-next-line camelcase
						results[ i ].source_title = results[ i ].source_title.toString();
					}
					if ( Buffer.isBuffer( results[ i ].target_title ) ) {
						// eslint-disable-next-line camelcase
						results[ i ].target_title = results[ i ].target_title.toString();
					}
				}
				return results;
			} finally {
				connection.end();
			}
		}

		if ( this.sectionMappingDatabaseConf.type === 'sqlite' ) {
			const queryStr = `SELECT source_title, target_title, frequency
				FROM titles
				WHERE source_language=?
				AND target_language=?
				AND source_title IN (${ sourceSections.map( () => '?' ) })
				ORDER BY source_title, frequency DESC
				`;
			const connection = await sqlite.open( {
				filename: this.sectionMappingDatabaseConf.database,
				driver: sqlite3.Database
			} );
			return await connection.all( queryStr, [ sourceLanguage, targetLanguage, ...sourceSections ] );
		} else {
			throw new Error( 'Section mapping database is not configured. sqlite or mysql database configuration required.' );
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

		const results = await this.querySectionMapping( sourceLanguage, targetLanguage, sourceSections );

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
			if ( mappingsLength > 0 && results[ i ].frequency < 100 && results[ i ].frequency < maxFrequency * 0.5 ) {
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

		const [ sourceSections, existingTargetSections ] = await Promise.all( [
			this.getSections( sourceLanguage, sourceTitle ),
			this.getSections( targetLanguage, targetTitle )
		] );

		const mapping = await this.getSectionMapping( sourceLanguage, sourceSections, targetLanguage );

		for ( let i = 0; i < sourceSections.length; i++ ) {
			const sourceSectionTitle = sourceSections[ i ];
			const candidateTargetSectionTitles = [ ...mapping[ sourceSectionTitle ] || [], ...mapping[ sourceSectionTitle.toLowerCase() ] || [] ];
			// candidateTargetSectionTitles will be in decreasing order of frequencies
			for ( let j = 0; j < candidateTargetSectionTitles.length; j++ ) {
				if ( existingTargetSections.includes( candidateTargetSectionTitles[ j ] ) ) {
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

		// As the last step, any section in sourceSections not present in `present`, add to `missing` if not present already.
		for ( let i = 0; i < sourceSections.length; i++ ) {
			if ( !present[ sourceSections[ i ] ] && !missing[ sourceSections[ i ] ] ) {
				missing[ sourceSections[ i ] ] = sourceSections[ i ];
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
