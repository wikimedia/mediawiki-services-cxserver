'use strict';

const sqlite = require( 'sqlite' );
// sqlite3 is a dependency of sqlite. We can use sqlite3 alone if we raise our
// minimum node version support to 11+. Currently it is 10.
const sqlite3 = require( 'sqlite3' );
const fs = require( 'fs' );
const yaml = require( 'js-yaml' );
const MTClients = require( __dirname + '/../../lib/mt/' );

/**
 * Align section titles in one language with section titles in another language.
 * This alignment is used for suggesting missing sections across articles in
 * different languages.
 * Here we use Machine translation to fill the title alignment.
 */
class AlignWithMT {
	/**
	 * Creates an instance of AlignWithMT.
	 *
	 * @param {Object} cxConf
	 * @memberof AlignWithMT
	 */
	constructor( cxConf ) {
		this.cxConfig = cxConf;
		this.sectionMappingDatabase = cxConf.conf.sectionmapping.database;
		if ( !this.sectionMappingDatabase ) {
			throw new Error( 'Section mapping database is not configured' );
		}
	}

	async run() {
		// Find frequently used section titles in English.
		const frequentSectionTitles = await this.findFrequentSectionTitles( this.sectionMappingDatabase, 'en' );
		console.log( `Found ${ frequentSectionTitles.length } frequent section titles` );

		// Find all target languages
		const targetLanguages = await this.findTargetLanguages( this.sectionMappingDatabase );
		console.log( `Found ${ targetLanguages.length } target languages` );

		for ( let i = 0; i < targetLanguages.length; i++ ) {
			const sourceLanguage = 'en';
			const targetLanguage = targetLanguages[ i ];

			const missingTitles = await this.findMissingAlignment( this.sectionMappingDatabase, 'en', targetLanguages[ i ], frequentSectionTitles );
			console.log( `Missing titles for en -> ${ targetLanguages[ i ] }: ${ missingTitles.length }` );
			if ( !missingTitles.length ) {
				continue;
			}

			// Machine translate the missing section title using a service(if any)
			// and add to the database
			/* @type {string[]} */
			const MTServices = await this.getMTService( 'en', targetLanguages[ i ] );
			if ( !MTServices || MTServices.length === 0 ) {
				continue;
			}

			// Use the default service from the list of available services
			const serviceName = MTServices[ 0 ];
			const alignment = {};
			for ( let j = 0; j < missingTitles.length; j++ ) {
				const translation = await this.mt( serviceName, sourceLanguage, targetLanguage, missingTitles[ j ] );
				if ( missingTitles[ j ] !== translation ) {
					alignment[ missingTitles[ j ] ] = translation;
				}
			}
			console.log( `[${ serviceName }] ${ sourceLanguage }->${ targetLanguage }` );
			if ( Object.keys( alignment ).length ) {
				console.table( alignment );
			} else {
				console.log( 'Could not calculate any alignment using machine translation' );
			}

			// Insert this alignment to the database.
			await this.addTitleAlignmentToDb( this.sectionMappingDatabase, sourceLanguage, targetLanguage, alignment );
		}
	}

	/**
	 * Find frequently used section titles in a given language.
	 *
	 * @param {string} sectionMappingDatabase Database path
	 * @param {string} sourceLanguage Source language code
	 * @return {string[]}
	 */
	async findFrequentSectionTitles( sectionMappingDatabase, sourceLanguage ) {
		const titles = [];
		const db = await sqlite.open( {
			filename: sectionMappingDatabase,
			driver: sqlite3.Database,
			mode: sqlite3.OPEN_READONLY
		} );
		const query = `select source_title,
			count(source_title) as occurrences
			from titles where source_language=?
			group by source_title
			order by occurrences desc
			limit 200`;
		const results = await db.all( query, [ sourceLanguage ] );
		for ( let i = 0; i < results.length; i++ ) {
			titles.push( results[ i ].source_title );
		}
		await db.close();

		return titles;
	}

	/**
	 * Find most used target languages
	 *
	 * @param {string} sectionMappingDatabase Database path
	 * @param {string} sourceLanguage Source language
	 * @param {string} targetLanguage Target language
	 * @param {string[]} sectionTitles
	 * @return {string[]}
	 */
	async findMissingAlignment( sectionMappingDatabase, sourceLanguage, targetLanguage, sectionTitles ) {
		// Clone the sectionTitles for local modification
		const titles = [ ...sectionTitles ];
		const db = await sqlite.open( {
			filename: sectionMappingDatabase,
			driver: sqlite3.Database,
			mode: sqlite3.OPEN_READONLY
		} );
		const query = `SELECT DISTINCT source_title
			from titles
			where source_language=?
			AND target_language=?
			AND source_title IN (${ sectionTitles.map( () => '?' ) })
			ORDER BY source_title, frequency DESC`;

		const results = await db.all( query, [ sourceLanguage, targetLanguage, ...sectionTitles ] );
		for ( let i = 0; i < results.length; i++ ) {
			const index = titles.indexOf( results[ i ].source_title );
			if ( index >= 0 ) {
				titles.splice( index, 1 );
			}
		}
		await db.close();

		return titles;
	}

	/**
	 * Find most used target languages
	 *
	 * @param {string} sectionMappingDatabase Database path
	 * @return {string[]}
	 */
	async findTargetLanguages( sectionMappingDatabase ) {
		const languages = [];
		const db = await sqlite.open( {
			filename: sectionMappingDatabase,
			driver: sqlite3.Database,
			mode: sqlite3.OPEN_READONLY
		} );
		console.log( 'findTargetLanguages' );
		const query = `select target_language, count(source_title) as occurrences
			FROM titles
			GROUP BY target_language
			ORDER BY occurrences desc
			limit 200;`;
		const results = await db.all( query );
		console.log( results.length );
		for ( let i = 0; i < results.length; i++ ) {
			// Skip English
			if ( results[ i ].target_language === 'en' ) {
				continue;
			}
			languages.push( results[ i ].target_language );
		}
		await db.close();
		return languages;
	}

	/**
	 * Insert section title mapping for a language pair
	 *
	 * @param {string} sectionMappingDatabase Database path
	 * @param {string} sourceLanguage Source language
	 * @param {string} targetLanguage Target language
	 * @param {Object} titleMapping
	 */
	async addTitleAlignmentToDb( sectionMappingDatabase, sourceLanguage, targetLanguage, titleMapping ) {
		const db = await sqlite.open( {
			filename: sectionMappingDatabase,
			driver: sqlite3.Database,
			mode: sqlite3.OPEN_READWRITE
		} );

		const query = 'INSERT INTO titles VALUES(?,?,?,?, ?)';
		// We set a special frequency value for MT calculated alignment. This is actually
		// arbitrary, but somewhat close to a possibly valid translation in comparison with
		// high frequency translation by a human translations.
		const frequency = 100;
		for ( const sourceTitle in titleMapping ) {
			const targetTitle = titleMapping[ sourceTitle ];
			await db.run( query, [ sourceLanguage, targetLanguage, sourceTitle, targetTitle, frequency ] );
		}
		await db.close();
	}

	/**
	 * Find the MT services available for given language pair.
	 *
	 * @param {string} sourceLanguage Source language
	 * @param {string} targetLanguage Target language
	 * @return {string[]}
	 */
	async getMTService( sourceLanguage, targetLanguage ) {
		// We can find the available MT services by using the cxserver registry.
		// But instantiating that is quite complex outside a server context.
		// To save the effort, rely on public API endpoint of cxserver.
		const response = await fetch( `https://cxserver.wikimedia.org/v2/list/mt/${ sourceLanguage }/${ targetLanguage }` );
		const data = await response.json();
		return data.mt;
	}

	/**
	 * Machine translate the given text for given language pair using given MT service.
	 *
	 * @param {string} serviceName
	 * @param {string} sourceLanguage Source language
	 * @param {string} targetLanguage Target language
	 * @param {string} text Text to translate.
	 * @return {string}
	 */
	async mt( serviceName, sourceLanguage, targetLanguage, text ) {
		const mt = new MTClients[ serviceName ]( this.cxConfig );
		return await mt.translate( sourceLanguage, targetLanguage, text );
	}
}

const config = yaml.load( fs.readFileSync( 'config.yaml' ) );
if ( !config ) {
	throw new Error( 'Failed to load config' );
}

const cxConfig = config.services && Array.isArray( config.services ) &&
	config.services.filter( ( item ) => item && item.name === 'cxserver' )[ 0 ];
if ( !cxConfig ) {
	throw new Error( 'Cannot find cxserver config' );
}
// Mock the metrics
cxConfig.metrics = {
	makeMetric: () => ( {
		increment: () => { }
	} )
};

const alignWithMT = new AlignWithMT( cxConfig );
alignWithMT.run();
