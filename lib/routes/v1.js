'use strict';

const sUtil = require( '../util' ),
	languageData = require( 'language-data' ),
	jwt = require( 'jsonwebtoken' ),
	MWPageLoader = require( '../mw/MWPageLoader' ),
	CXConfig = require( '../Config.js' );
const MWApiRequestManager = require( '../../lib/mw/ApiRequestManager' );

class Routes {
	constructor( app, registry ) {
		this.app = app;
		this.registry = registry;
		this.router = sUtil.router();
		if ( !this.app ) {
			throw new Error( 'Missing app property' );
		}
		if ( !this.registry ) {
			throw new Error( 'Missing registry property' );
		}
		this.registerRoutes();
	}

	/**
	 * route definitions
	 */
	get routes() {
		return {
			'/page/:language/:title/:revision?': this.fetchPage,
			'POST /mt/:from/:to/:provider?': this.machineTranslate,
			'/dictionary/:word/:from/:to/:provider?': this.dictionary,
			'/list/tool/:tool': this.listTool,
			'/list/pair/:from/:to': this.listToolForLanguagePair,
			'/languagepairs': this.listLanguagePairs,
			'/list/languagepairs': this.listLanguagePairs,
			'/list/:tool/:from?/:to?': this.listToolForLanguagePairsAndTool,
			'POST /translate/:from/:to/:provider?': this.translate
		};
	}

	/**
	 * It goes through each route defition, figures out the verb/action to use
	 * (default: get), the function to call to handle the request and registers
	 * the whole for the given path.
	 */
	registerRoutes() {
		const routes = this.routes;

		Object.keys( routes ).forEach( ( path ) => {
			let parts = path.split( ' ' );
			let verb = parts[ 1 ] ? parts[ 0 ] : 'get';
			verb = verb.toLowerCase();
			if ( !routes[ path ] ) {
				throw new Error( `Could not find handler for path ${path}` );
			}
			this.router[ verb ]( parts[ 1 ] || parts[ 0 ], routes[ path ].bind( this ) );
		} );
	}

	fetchPage( req, res ) {
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
				.end( `Invalid language code for page fetch: ${sourceLanguage}` );
		}

		const pageLoader = new MWPageLoader( {
			context: this.app,
			sourceLanguage
		} );

		this.app.logger.log( 'debug', `Getting page ${sourceLanguage}:${title}` );
		return pageLoader.getPage( title, revision ).then(
			( response ) => {
				res.send( {
					sourceLanguage,
					title,
					revision: response.revision,
					segmentedContent: response.content
				} );
				this.app.logger.log( 'debug', 'Page sent' );
			},
			( error ) => {
				res.status( 404 )
					.end( `Page ${sourceLanguage}:${title} could not be found. ` + error.toString() );
			}
		);
	}

	/**
	 * Get the appropriate machine translation service client
	 * @param {Request} req request object
	 * @param {Response} res response object
	 * @return {mtClient}
	 */
	getMTClient( req, res ) {
		var mtClients, mtClient, provider,
			authzToken, jwtConfig,
			from = req.params.from,
			to = req.params.to;

		provider = this.registry.getValidProvider( from, to, 'mt', req.params.provider );

		if ( !provider ) {
			res.status( 404 ).end( 'Provider not supported' );
			return;
		}

		mtClients = require( __dirname + '/../mt/' );
		if ( mtClients[ provider ] === undefined ) {
			res.status( 500 ).end( 'Provider not found' );
			return;
		}

		mtClient = new mtClients[ provider ]( this.app );

		if ( mtClient.requiresAuthorization() ) {
			if ( !req.headers || !req.headers.authorization ) {
				res.status( 403 ).end( 'Authorization header is missing' );
				return;
			}

			authzToken = req.headers.authorization;
			jwtConfig = this.app.conf.jwt;

			try {
				jwt.verify( authzToken, jwtConfig.secret, {
					algorithms: jwtConfig.algorithms
				} );
			} catch ( err ) {
				res.status( 403 ).end( 'Authorization header is not valid: ' + err );
				return;
			}
		}
		return mtClient;
	}

	/**
	 * Machine translation api handler
	 * @param {Request} req request object
	 * @param {Response} res response object
	 * @return {Promise}
	 */
	machineTranslate( req, res ) {
		var mtClient, sourceHtml,
			from = req.params.from,
			to = req.params.to;

		mtClient = this.getMTClient( req, res );

		if ( !mtClient ) {
			return;
		}

		// We support setting html as body or as body.html. But body.html is the recommended way.
		// The other way will be removed soon.
		sourceHtml = req.body.html || req.rawBody;
		return mtClient.translate( from, to, sourceHtml ).then(
			( data ) => {
				res.json( {
					contents: data
				} );
			},
			( error ) => {
				res.status( 500 ).end( error.toString() );
				this.app.logger.log( 'error', 'MT processing error: ' + error.stack );
			}
		);
	}
	/**
	 * Dictionary api handler
	 * @param {Request} req request object
	 * @param {Response} res response object
	 * @return {Promise}
	 */
	dictionary( req, res ) {
		var dictClients, provider, dictClient,
			word = req.params.word,
			from = req.params.from,
			to = req.params.to;

		provider = this.registry.getValidProvider( from, to, 'dictionary', req.params.provider );

		if ( !provider ) {
			res.status( 404 ).end( 'Dictionary provider invalid or missing' );
			return;
		}

		dictClients = require( __dirname + '/../dictionary/' );
		dictClient = new dictClients[ provider ]( this.app );

		return dictClient.getTranslations( word, from, to ).then(
			( data ) => {
				res.send( data );
			},
			( error ) => {
				res.status( 500 ).end( error.toString() );
				this.app.logger.log( 'error', 'Dictionary lookup error: (%s)', error.toString() );
			}
		);
	}

	/**
	 * Get a list of all language pairs that tool supports.
	 * @param {Request} req request object
	 * @param {Response} res response object
	 */
	listTool( req, res ) {
		var result,
			tool = req.params.tool;

		if ( tool === 'mt' ) {
			result = this.registry.MTPairs;
		}
		if ( tool === 'dictionary' ) {
			result = this.registry.DictionaryPairs;
		}

		if ( !result ) {
			res.status( 404 ).end( 'Unknown tool' );
			return;
		}

		res.json( result );
	}

	/**
	 * Lists the available tools for a language pair.
	 * @param {Request} req request object
	 * @param {Response} res response object
	 */
	listToolForLanguagePair( req, res ) {
		var result,
			from = req.params.from,
			to = req.params.to;

		result = this.registry.getToolSet( from, to );

		res.json( result );
	}

	/**
	 * Get a list of all language pairs.
	 * @param {Request} req request object
	 * @param {Response} res response object
	 */
	listLanguagePairs( req, res ) {
		res.json( this.registry.LanguagePairs );
	}

	/**
	 * @param {Request} req request object
	 * @param {Response} res response object
	 */
	listToolForLanguagePairsAndTool( req, res ) {
		var toolset, result = {},
			tool = req.params.tool,
			from = req.params.from,
			to = req.params.to;

		if ( from && to ) {
			toolset = this.registry.getToolSet( from, to );
			result[ tool ] = toolset[ tool ];
			result.default = toolset.default;
		} else if ( tool ) {
			if ( tool === 'mt' ) {
				result = this.registry.MTPairs;
			}
			if ( tool === 'dictionary' ) {
				result = this.registry.DictionaryPairs;
			}
		}
		res.json( result );
	}

	/**
	 * @param {Request} req request object
	 * @param {Response} res response object
	 * @return {Promise}
	 */
	translate( req, res ) {
		var mtClient, sourceHtml, machineTranslationRequest,
			from = req.params.from,
			to = req.params.to;

		if ( req.params.provider ) {
			mtClient = this.getMTClient( req, res );
			if ( !mtClient ) {
				// With explicit provider, if not MT Client found, it is an error.
				return;
			}
		}

		sourceHtml = req.body.html;

		if ( !mtClient ) {
			machineTranslationRequest = Promise.resolve( sourceHtml );
		} else {
			machineTranslationRequest = mtClient.translate( from, to, sourceHtml );
		}

		return machineTranslationRequest.then( ( translatedHTML ) => {
			var CXAdapter = require( __dirname + '/../Adapter' );

			this.app.conf.mtClient = mtClient;
			// Note: If caching is wanted across requests, move this higher up
			const api = new MWApiRequestManager( this.app );

			return new CXAdapter( from, to, api, this.app )
				.adapt( translatedHTML )
				.then( ( adaptedDoc ) => {
					res.json( {
						contents: adaptedDoc.getHtml()
					} );
				}, ( error ) => {
					res.status( 500 ).end( error.stack );
					this.app.logger.log( 'error', 'MT processing error: ' + error.stack );
				} );
		} );
	}
}

module.exports = ( appObj ) => {
	const registry = new CXConfig( appObj );
	const routes = new Routes( appObj, registry );
	return {
		path: '/v1/',
		// eslint-disable-next-line camelcase
		api_version: 1,
		router: routes.router,
		// eslint-disable-next-line camelcase
		skip_domain: true
	};
};
