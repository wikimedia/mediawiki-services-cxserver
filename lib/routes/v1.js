/**
 * @external MTClient
 * @external Request
 * @external Response
 */

import { promisify } from 'util';
import languageData from '@wikimedia/language-data';
import jwt from 'jsonwebtoken';
import express from 'express';
import { default as MWPageLoader } from '../mw/MWPageLoader.js';
import { default as swaggerUi } from '../swagger-ui.js';

const router = express.Router();

router.get( '/', getSpec );
router.get( '/page/:language/:title/:revision?', fetchPage );
router.post( '/mt/:from/:to/:provider?', machineTranslate );
router.get( '/list/pair/:from/:to', listToolForLanguagePair );
router.get( '/list/languagepairs', listLanguagePairs );
router.get( '/list/:tool/:from?/:to?', listToolForLanguagePairsAndTool );

/**
 * GET /
 * Main entry point. Currently it only responds if the spec or doc query
 * parameter is given, otherwise lets the next middleware handle it
 *
 * @param {Request} req request object
 * @param {Response} res response object
 * @return {Promise|null}
 */
function getSpec( req, res ) {
	if ( {}.hasOwnProperty.call( req.query || {}, 'spec' ) ) {
		res.json( req.app.conf.spec );
	} else if ( {}.hasOwnProperty.call( req.query || {}, 'doc' ) ) {
		return swaggerUi.processRequest( req.app, req, res );
	} else {
		res.redirect( 301, '?doc' );
	}
}

function fetchPage( req, res, next ) {
	const title = req.params.title,
		revision = req.params.revision;

	// In case of wikimedia service hosting, cxserver is configured behind
	// xx.wikipedia.org/api/.. instead of language code, we get domain name.
	// Split by . seems safe here. But note that this is not respecting
	// domain pattern configured by mw_host
	const sourceLanguageOrDomain = req.params.language;
	const sourceLanguage = sourceLanguageOrDomain.split( '.' )[ 0 ];
	if ( !languageData.isKnown( sourceLanguage ) ) {
		return res.status( 400 )
			.end( `Invalid language code for page fetch: ${ sourceLanguage }` );
	}

	const pageLoader = new MWPageLoader( {
		context: req.app,
		sourceLanguage
	} );

	req.app.logger.log( 'debug', `Getting page ${ sourceLanguage }:${ title }` );
	return pageLoader.getPage( title, revision ).then(
		( response ) => {
			res.send( {
				sourceLanguage,
				title,
				revision: response.revision,
				segmentedContent: response.content
			} );
			req.app.logger.log( 'debug', 'Page sent' );
		},
		( error ) => {
			res.status( 404 )
				.end( `Page ${ sourceLanguage }:${ title } could not be found. ` + error.toString() );
			next( error );
		}
	);
}

/**
 * Get the appropriate machine translation service client
 *
 * @param {Request} req request object
 * @param {Response} res response object
 * @return {MTClient}
 */
async function getMTClient( req, res ) {
	const from = req.params.from,
		to = req.params.to;

	const provider = req.app.registry.getValidProvider( from, to, 'mt', req.params.provider );

	if ( !provider ) {
		res.status( 404 ).end( 'Provider not supported' );
		return;
	}

	// try to import the provider fom the mt directory
	let ProviderClass;
	try {
		ProviderClass = ( await import( `../mt/${ provider }.js` ) ).default;
	} catch ( e ) {
		res.status( 500 ).end( 'Provider not found' );
		return;
	}

	const mtClient = new ProviderClass( req.app );

	if ( mtClient.requiresAuthorization() ) {
		if ( !req.headers || !req.headers.authorization ) {
			res.status( 403 ).end( 'Authorization header is missing' );
			return;
		}

		const authzToken = req.headers.authorization;
		const jwtConfig = req.app.conf.jwt;

		const jwtVerifyAsync = promisify( jwt.verify );
		try {
			await jwtVerifyAsync( authzToken, jwtConfig.secret, {
				algorithms: jwtConfig.algorithms
			} );
		} catch ( err ) {
			res.status( 403 ).end( 'Authorization header is not valid: ' + err.message );
			return;
		}
	}
	return mtClient;
}

/**
 * Machine translation api handler
 *
 * @param {Request} req request object
 * @param {Response} res response object
 * @param {Function} next Next middleware
 * @return {Promise}
 */
async function machineTranslate( req, res, next ) {
	const from = req.params.from,
		to = req.params.to;

	const mtClient = await getMTClient( req, res );

	if ( !mtClient ) {
		return;
	}

	// We support setting html as body or as body.html. But body.html is the recommended way.
	// The other way will be removed soon.
	const sourceHtml = req.body.html || req.rawBody;
	if ( !sourceHtml || sourceHtml.trim().length === 0 ) {
		res.status( 400 ).end( 'Content for machine translation is not given or is empty' );
		return;
	}
	return mtClient.translate( from, to, sourceHtml ).then(
		( data ) => {
			res.json( {
				contents: data
			} );
			if ( req.app.metrics?.makeMetric ) {
				req.app.metrics.makeMetric( {
					type: 'Counter',
					name: `translate.${ req.params.provider }.200`,
					help: 'Successful MT Request count'
				} ).increment();
			}
		},
		( error ) => {

			if ( req.app.metrics?.makeMetric ) {
				req.app.metrics.makeMetric( {
					type: 'Counter',
					name: `translate.${ req.params.provider }.500`,
					help: 'Failed MT Request count'
				} ).increment();
			}
			req.app.logger.log( 'error', `MT processing error for: ${ from } > ${ to }. ` +
				`${ error.stack }` );
			next( error );
		}
	);
}

/**
 * Get a list of all language pairs that tool supports.
 *
 * @param {Request} req request object
 * @param {Response} res response object
 */
function listTool( req, res ) {
	const tool = req.params.tool;
	let result;

	if ( tool === 'mt' ) {
		result = req.app.registry.MTPairs;
	}
	if ( !result ) {
		res.status( 404 ).end( 'Unknown tool' );
		return;
	}

	res.json( result );
}

/**
 * Lists the available tools for a language pair.
 *
 * @param {Request} req request object
 * @param {Response} res response object
 */
function listToolForLanguagePair( req, res ) {
	const from = req.params.from,
		to = req.params.to;

	const result = req.app.registry.getToolSet( from, to );

	res.json( result );
}

/**
 * Get a list of all language pairs.
 *
 * @param {Request} req request object
 * @param {Response} res response object
 */
function listLanguagePairs( req, res ) {
	res.json( req.app.registry.LanguagePairs );
}

/**
 * @param {Request} req request object
 * @param {Response} res response object
 */
function listToolForLanguagePairsAndTool( req, res ) {
	const result = {},
		tool = req.params.tool,
		from = req.params.from,
		to = req.params.to;

	if ( from ) {
		const toolset = req.app.registry.getToolSet( from, to );
		result[ tool ] = toolset[ tool ];
		result.default = toolset.default;
		res.json( result );
	} else if ( tool ) {
		listTool( req, res );
	}
}

export {
	router,
	getSpec,
	machineTranslate,
	listToolForLanguagePair,
	listLanguagePairs,
	listToolForLanguagePairsAndTool,
	getMTClient
};
