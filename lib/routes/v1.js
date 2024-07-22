'use strict';

/**
 * @external MTClient
 * @external Request
 * @external Response
 */

const sUtil = require( '../util' ),
	languageData = require( '@wikimedia/language-data' ),
	jwt = require( 'jsonwebtoken' ),
	MWPageLoader = require( '../mw/MWPageLoader' ),
	swaggerUi = require( '../swagger-ui' ),
	CXConfig = require( '../Config' );

class RoutesV1 {
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
	 * Route definitions
	 *
	 * @return {Object}
	 */
	get routes() {
		return {
			'/': this.getSpec,
			'/page/:language/:title/:revision?': this.fetchPage,
			'POST /mt/:from/:to/:provider?': this.machineTranslate,
			'/list/tool/:tool': this.listTool,
			'/list/pair/:from/:to': this.listToolForLanguagePair,
			'/languagepairs': this.listLanguagePairs,
			'/list/languagepairs': this.listLanguagePairs,
			'/list/:tool/:from?/:to?': this.listToolForLanguagePairsAndTool
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
			const parts = path.split( ' ' );
			let verb = parts[ 1 ] ? parts[ 0 ] : 'get';
			verb = verb.toLowerCase();
			if ( !routes[ path ] ) {
				throw new Error( `Could not find handler for path ${ path }` );
			}
			this.router[ verb ]( parts[ 1 ] || parts[ 0 ], routes[ path ].bind( this ) );
		} );
	}

	/**
	 * GET /
	 * Main entry point. Currently it only responds if the spec or doc query
	 * parameter is given, otherwise lets the next middleware handle it
	 *
	 * @param {Request} req request object
	 * @param {Response} res response object
	 * @return {Promise|null}
	 */
	getSpec( req, res ) {
		if ( {}.hasOwnProperty.call( req.query || {}, 'spec' ) ) {
			res.json( this.app.conf.spec );
		} else if ( {}.hasOwnProperty.call( req.query || {}, 'doc' ) ) {
			return swaggerUi.processRequest( this.app, req, res );
		} else {
			res.redirect( 301, '?doc' );
		}
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
				.end( `Invalid language code for page fetch: ${ sourceLanguage }` );
		}

		const pageLoader = new MWPageLoader( {
			context: this.app,
			sourceLanguage
		} );

		this.app.logger.log( 'debug', `Getting page ${ sourceLanguage }:${ title }` );
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
					.end( `Page ${ sourceLanguage }:${ title } could not be found. ` + error.toString() );
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
	getMTClient( req, res ) {
		const from = req.params.from,
			to = req.params.to;

		const provider = this.registry.getValidProvider( from, to, 'mt', req.params.provider );

		if ( !provider ) {
			res.status( 404 ).end( 'Provider not supported' );
			return;
		}

		const mtClients = require( __dirname + '/../mt/' );
		if ( mtClients[ provider ] === undefined ) {
			res.status( 500 ).end( 'Provider not found' );
			return;
		}

		const mtClient = new mtClients[ provider ]( this.app );

		if ( mtClient.requiresAuthorization() ) {
			if ( !req.headers || !req.headers.authorization ) {
				res.status( 403 ).end( 'Authorization header is missing' );
				return;
			}

			const authzToken = req.headers.authorization;
			const jwtConfig = this.app.conf.jwt;

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
	 *
	 * @param {Request} req request object
	 * @param {Response} res response object
	 * @return {Promise}
	 */
	machineTranslate( req, res ) {
		const from = req.params.from,
			to = req.params.to;

		const mtClient = this.getMTClient( req, res );

		if ( !mtClient ) {
			return;
		}

		// We support setting html as body or as body.html. But body.html is the recommended way.
		// The other way will be removed soon.
		const sourceHtml = req.body.html || req.rawBody;
		if ( !sourceHtml || sourceHtml.trim().length === 0 ) {
			res.status( 500 ).end( 'Content for machine translation is not given or is empty' );
			return;
		}
		return mtClient.translate( from, to, sourceHtml ).then(
			( data ) => {
				res.json( {
					contents: data
				} );
				if ( this.app.metrics?.makeMetric ) {
					this.app.metrics.makeMetric( {
						type: 'Counter',
						name: `translate.${ req.params.provider }.200`,
						prometheus: {
							name: `translate_${ req.params.provider }_200`,
							help: 'Successful MT Request count'
						}
					} )?.increment();
				}
			},
			( error ) => {
				res.status( error.status || 500 ).end( error.stack );
				if ( this.app.metrics?.makeMetric ) {
					this.app.metrics.makeMetric( {
						type: 'Counter',
						name: `translate.${ req.params.provider }.500`,
						prometheus: {
							name: `translate_${ req.params.provider }_500`,
							help: 'Failed MT Request count'
						}
					} )?.increment();
				}
				this.app.logger.log( 'error', `MT processing error for: ${ from } > ${ to }. ` +
					`${ error.stack }` );
			}
		);
	}

	/**
	 * Get a list of all language pairs that tool supports.
	 *
	 * @param {Request} req request object
	 * @param {Response} res response object
	 */
	listTool( req, res ) {
		const tool = req.params.tool;
		let result;

		if ( tool === 'mt' ) {
			result = this.registry.MTPairs;
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
	listToolForLanguagePair( req, res ) {
		const from = req.params.from,
			to = req.params.to;

		const result = this.registry.getToolSet( from, to );

		res.json( result );
	}

	/**
	 * Get a list of all language pairs.
	 *
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
		const result = {},
			tool = req.params.tool,
			from = req.params.from,
			to = req.params.to;

		if ( from ) {
			const toolset = this.registry.getToolSet( from, to );
			result[ tool ] = toolset[ tool ];
			result.default = toolset.default;
			res.json( result );
		} else if ( tool ) {
			this.listTool( req, res );
		}
	}

	static create( appObj ) {
		const registry = new CXConfig( appObj );
		const routes = new RoutesV1( appObj, registry );
		return {
			path: '/v1/',
			// eslint-disable-next-line camelcase
			api_version: 1,
			router: routes.router,
			// eslint-disable-next-line camelcase
			skip_domain: true
		};
	}
}

module.exports = RoutesV1;
