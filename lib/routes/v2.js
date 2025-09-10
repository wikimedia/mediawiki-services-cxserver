/**
 * @external Request
 * @external Response
 */

import { promisify } from 'util';
import languageData from '@wikimedia/language-data';
import jwt from 'jsonwebtoken';
import express from 'express';
import MWPageLoader from '../mw/MWPageLoader.js';
import CXAdapter from '../Adapter.js';
import MWApiRequestManager from '../mw/MWApiRequestManager.js';
import { SectionSuggester, SourceSuggester } from '../suggestion/index.js';
import { HTTPError } from '../util.js';
import MTClientError from '../mt/MTClientError.js';
import { getMTClient, getSpec, listLanguagePairs, listToolForLanguagePair, listToolForLanguagePairsAndTool, machineTranslate } from './v1.js';
const router = express.Router();

router.get( '/', getSpec );
router.post( '/mt/:from/:to/:provider?', machineTranslate );
router.get( '/list/pair/:from/:to', listToolForLanguagePair );
router.get( '/list/languagepairs', listLanguagePairs );
router.get( '/list/:tool/:from?/:to?', listToolForLanguagePairsAndTool );
router.get( '/page/:sourcelanguage/:targetlanguage/:title/:revision?', fetchPage );
router.post( '/translate/:from/:to/:provider?', translate );
router.get( '/suggest/title/:title/:from/:to', suggestTargetTitle );
router.get( '/suggest/source/:title/:to', suggestSource );
router.get( '/suggest/sections/titles/:from/:to', suggestSectionsBySourceSectionTitles );
router.get( '/suggest/sections/:title/:from/:to', suggestSections );

/**
 * Given a source title, a source language and a target language,
 * this action returns an object containing the source language,
 * the target language, the source title and the suggested target title.
 * The suggested title is fetched from Wikidata API, if it exists for the
 * given target language. If not, the source title is translated using the default
 * MT provider for that language pair, and this translation is returned
 * as suggested target title. Finally, if the translation fails too, the
 * source title is returned as suggested target title.
 * Success response format:
 * {sourceLanguage: string, targetLanguage: string, sourceTitle: string, targetTitle: string}
 *
 * @param {Request} req request object
 * @param {Response} res response object
 * @param {Function} next Next middleware
 * @return {Promise}
 */
async function suggestTargetTitle( req, res, next ) {
	const title = req.params.title, sourceLanguage = req.params.from, targetLanguage = req.params.to;

	try {
		const pageLoader = new MWPageLoader( {
			context: req.app,
			sourceLanguage,
			targetLanguage
		} );

		let mtClient;
		try {
			mtClient = await getMTClient( req, res );
		} catch ( e ) {
			if ( e instanceof MTClientError ) {
				res.status( e.code ).end( e.message );
			}
			return next( e );
		}
		const targetTitleInfo = await pageLoader.fetchTargetTitle( title, mtClient );

		if ( !targetTitleInfo ) {
			return res.status( 404 ).send( `Title "${ title }" doesn't exist for ${ sourceLanguage } language` );
		}
		return res.status( 200 ).send( targetTitleInfo );
	} catch ( error ) {
		req.app.logger.error( `Suggesting target title for source title "${ title }" failed for language pair ${ sourceLanguage }-${ targetLanguage }: ${ error.stack }` );
		next( error );
	}
}

/**
 * Given a target language this action returns an object that
 * maps section titles in source language to an array of possible
 * translations of these titles in the target language
 *
 * @param {Request} req request object
 * @param {Response} res response object
 * @param {Function} next Next middleware
 * @return {Promise<Object>}
 */
async function suggestSectionsBySourceSectionTitles( req, res, next ) {
	const sourceLanguage = req.params.from.split( '.' )[ 0 ];
	const targetLanguage = req.params.to.split( '.' )[ 0 ];
	if ( !languageData.isKnown( sourceLanguage ) ) {
		return res.status( 400 )
			.end( `Invalid source language code for suggesting target sections by source section titles: ${ sourceLanguage }` );
	}
	if ( !languageData.isKnown( targetLanguage ) ) {
		return res.status( 400 )
			.end( `Invalid target language code for suggesting target sections by source section titles: ${ targetLanguage }` );
	}

	if ( !req.query.titles ) {
		return res.status( 400 )
			.end( 'Source titles should be provided' );
	}

	const sourceSections = req.query.titles.split( '|' );

	try {
		const api = new MWApiRequestManager( req.app, req.app.logger );
		const titles = await new SectionSuggester(
			api, req.app.conf.sectionmapping
		).getSectionMapping( sourceLanguage, sourceSections, targetLanguage );

		return res.send( titles );
	} catch ( error ) {
		req.app.logger.error( `Error suggesting target sections by source section titles for language pair ${ sourceLanguage }-${ targetLanguage }: ${ error.stack }` );
		next( error );
	}
}

function fetchPage( req, res, next ) {
	const title = req.params.title,
		revision = req.params.revision;

	// In case of wikimedia service hosting, cxserver is configured behind
	// xx.wikipedia.org/api/.. instead of language code, we get domain name.
	// Split by . seems safe here. But note that this is not respecting
	// domain pattern configured by mw_host
	const sourceLanguage = req.params.sourcelanguage.split( '.' )[ 0 ];
	const targetLanguage = req.params.targetlanguage.split( '.' )[ 0 ];
	if ( !languageData.isKnown( sourceLanguage ) ) {
		return res.status( 400 )
			.end( `Invalid language code for page fetch: ${ sourceLanguage }` );
	}
	if ( !languageData.isKnown( targetLanguage ) ) {
		return res.status( 400 )
			.end( `Invalid language code for target language in page fetch: ${ targetLanguage }` );
	}
	const pageLoader = new MWPageLoader( {
		context: req.app,
		sourceLanguage,
		targetLanguage
	} );

	req.app.logger.log( 'debug', `Getting page ${ sourceLanguage }:${ title } for ${ targetLanguage }` );
	return pageLoader.getPage( title, revision, true /* wrapSections */ ).then(
		( response ) => {
			res.send( {
				sourceLanguage,
				title,
				revision: response.revision,
				segmentedContent: response.content,
				categories: response.categories
			} );
			req.app.logger.log( 'debug', 'Page sent' );
		},
		( error ) => {
			if ( error instanceof HTTPError ) {
				res.status( error.status )
					.end( error.message );
				return next( error );
			}
			req.app.logger.debug( `Error fetching page ${ sourceLanguage }:${ title } for ${ targetLanguage }: ${ error.toString() }` );
			res.status( 500 )
				.end( `Page ${ sourceLanguage }:${ title } could not be fetched. Error: ${ error.toString() }` );
			next( error );
		}
	);
}

/**
 * @param {Request} req request object
 * @param {Response} res response object
 * @param {Function} next Next middleware
 * @return {Promise}
 */
async function translate( req, res, next ) {
	const from = req.params.from,
		to = req.params.to,
		provider = req.params.provider;

	let mtClient;
	// If no MT provider is specified, don't use the default instead just perform adaptation
	// to support the copy content behavior in CX
	if ( provider ) {
		try {
			mtClient = await getMTClient( req, res );
		} catch ( e ) {
			// Don't bother logging MTClient authentication errors.
			if ( !( e instanceof MTClientError ) || e.code >= 500 ) {
				// Log the error and continue execution
				req.app.logger.error( 'MT Client Error', e );
			}
		}
	}

	const sourceHtml = req.body.html;

	if ( !sourceHtml || sourceHtml.trim().length === 0 ) {
		res.status( 500 ).end( 'Content for translate is not given or is empty' );
		return;
	}

	let machineTranslationRequest;
	if ( !mtClient ) {
		machineTranslationRequest = Promise.resolve( sourceHtml );
	} else {
		machineTranslationRequest = mtClient.translate( from, to, sourceHtml );
	}

	return machineTranslationRequest.then( ( translatedHTML ) => {

		req.app.conf.mtClient = mtClient;
		// Note: If caching is wanted across requests, move this higher up
		const api = new MWApiRequestManager( req.app, req.app.logger );

		if ( req.app.metrics ) {
			req.app.metrics.makeMetric( {
				type: 'Counter',
				name: `translate.${ mtClient?.constructor.name || 'source' }.200`,
				help: 'Successful MT Request count'
			} ).increment();
		}

		return new CXAdapter( from, to, api, req.app )
			.adapt( translatedHTML )
			.then( ( adaptedDoc ) => {
				res.json( {
					contents: adaptedDoc.getHtml()
				} );
			}, ( error ) => {
				req.app.logger.error( `Adaptation error for content: ${ from } > ${ to }. ` +
					`${ error.stack }` );
				next( error );
			} );
	}, ( error ) => {
		if ( req.app.metrics ) {
			req.app.metrics.makeMetric( {
				type: 'Counter',
				name: `translate.${ provider }.500`,
				help: 'Failed MT Request count'
			} ).increment();
		}
		req.app.logger.error( `MT processing error for: ${ from } > ${ to }. ` +
			`${ error.stack }` );
		next( error );
	} );
}

/**
 * Suggest a source article to use for creating given
 * article in given target language using translation
 *
 * @param {Request} req Request object
 * @param {Response} res Response object
 * @param {Function} next Next middleware
 * @return {Promise} Promise that resolves as array of source title information objects.
 *   In each object, title, language, pageid, description, thumbnail, pageprops can be expected.
 */
async function suggestSource( req, res, next ) {
	let sourceLanguages = req.query.sourcelanguages;
	if ( sourceLanguages ) {
		sourceLanguages = sourceLanguages.split( /[,\\s\\n]/g );
	} else {
		sourceLanguages = [];
	}

	// Remove any unknown languages.
	sourceLanguages = sourceLanguages.filter( ( sourceLanguage ) => languageData.isKnown( sourceLanguage ) );

	const api = new MWApiRequestManager( req.app, req.app.logger );

	// Finding a suitable source article requires a lot of API hits, sometimes
	// machine translation requests too. Make sure we don't do it for too many languages.
	if ( sourceLanguages.length > 5 ) {
		res.status( 500 ).end( 'Too many source language candidates. Maximum 5 allowed.' );
		return;
	}

	// Callback method for getting a valid MT engine for a language pair
	const mtProviderFactory = async ( from, to ) => {
		const provider = req.app.registry.getValidProvider( from, to, 'mt' );
		// try to import the provider fom the mt directory
		let ProviderClass;
		try {
			ProviderClass = ( await import( `../mt/${ provider }.js` ) ).default;
		} catch ( e ) {
			req.app.logger.info( `No MT provider found for ${ from } to ${ to }` );
			return null;
		}

		const mtClient = new ProviderClass( req.app );

		if ( mtClient.requiresAuthorization() ) {
			if ( !req.headers || !req.headers.authorization ) {
				return null;
			}

			const jwtVerifyAsync = promisify( jwt.verify );
			try {
				await jwtVerifyAsync(
					req.headers.authorization,
					req.app.conf.jwt.secret,
					{ algorithms: req.app.conf.jwt.algorithms }
				);
			} catch ( err ) {
				// Ignore error. Just don't provide this MT engine
				return null;
			}
		}
		return mtClient;
	};

	const targetLanguage = req.params.to;
	if ( !languageData.isKnown( targetLanguage ) ) {
		return res.status( 400 )
			.end( `Invalid language code for suggesting sections: ${ targetLanguage }` );
	}

	try {
		const suggestions = await new SourceSuggester(
			targetLanguage,
			req.params.title,
			{
				sourceLanguages,
				api,
				context: req.app,
				mtProviderFactory
			}
		).suggest();

		return res.json( { suggestions } );
	} catch ( error ) {
		req.app.logger.error( `Error suggesting source for title "${ req.params.title }" in language "${ req.params.to }": ${ error.stack }` );

		next( error );
	}
}

/**
 * Suggest missing sections in target article based on the sections present
 * in corresponding source article. The suggested sections are suggestions
 * only and does not guarantee 100% accuracy.
 *
 * @param {Request} req Request object
 * @param {Response} res Response object
 * @param {Function} next Next middleware
 * @return {Promise}
 */
async function suggestSections( req, res, next ) {
	const sourceLanguage = req.params.from;
	const targetLanguage = req.params.to;
	const sourceTitle = req.params.title;
	if ( !languageData.isKnown( sourceLanguage ) ) {
		return res.status( 400 )
			.end( `Invalid language code for suggesting sections: ${ sourceLanguage }` );
	}
	if ( !languageData.isKnown( targetLanguage ) ) {
		return res.status( 400 )
			.end( `Invalid language code for target language for suggesting sections: ${ targetLanguage }` );
	}
	const api = new MWApiRequestManager( req.app, req.app.logger );
	const titlePairInfo = await api.titlePairRequest( sourceTitle, sourceLanguage, targetLanguage );
	const targetTitle = titlePairInfo && titlePairInfo.targetTitle;
	if ( !targetTitle ) {
		return res.status( 404 )
			.end( `Target article does not exist for ${ sourceLanguage }:${ sourceTitle } in ${ targetLanguage } language` );
	}

	try {
		// Parse include_section_sizes query parameter
		const includeSectionSizes = req.query.include_section_sizes === 'true';
		const sections = await new SectionSuggester(
			api,
			req.app.conf.sectionmapping
		).getMissingSections( sourceLanguage, sourceTitle, targetLanguage, targetTitle, includeSectionSizes );
		return res.json( { sections } );
	} catch ( error ) {
		req.app.logger.error( `Error suggesting sections for title "${ sourceTitle }" in language "${ sourceLanguage }" to "${ targetLanguage }": ${ error.stack }` );
		next( error );
	}
}

export default router;
