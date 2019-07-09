'use strict';

const languageData = require( 'language-data' ),
	MWPageLoader = require( '../mw/MWPageLoader' ),
	jwt = require( 'jsonwebtoken' ),
	CXConfig = require( '../Config' ),
	RoutesV1 = require( './v1' ),
	MWApiRequestManager = require( '../../lib/mw/ApiRequestManager' ),
	SourceSuggester = require( '../suggestion' ).SourceSuggester;

class RoutesV2 extends RoutesV1 {
	/**
	 * route definitions
	 */
	get routes() {
		return {
			'/': this.getSpec,
			'/page/:sourcelanguage/:targetlanguage/:title/:revision?': this.fetchPage,
			'POST /mt/:from/:to/:provider?': this.machineTranslate,
			'/dictionary/:word/:from/:to/:provider?': this.dictionary,
			'/list/pair/:from/:to': this.listToolForLanguagePair,
			'/list/languagepairs': this.listLanguagePairs,
			'/list/:tool/:from?/:to?': this.listToolForLanguagePairsAndTool,
			'POST /translate/:from/:to/:provider?': this.translate,
			'/suggest/source/:title/:to': this.suggestSource
		};
	}

	fetchPage( req, res ) {
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
				.end( `Invalid language code for page fetch: ${sourceLanguage}` );
		}
		if ( !languageData.isKnown( targetLanguage ) ) {
			return res.status( 400 )
				.end( `Invalid language code for target language in page fetch: ${targetLanguage}` );
		}
		const pageLoader = new MWPageLoader( {
			context: this.app,
			sourceLanguage,
			targetLanguage
		} );

		this.app.logger.log( 'debug', `Getting page ${sourceLanguage}:${title} for ${targetLanguage}` );
		return pageLoader.getPage( title, revision, true /* wrapSections */ ).then(
			( response ) => {
				res.send( {
					sourceLanguage,
					title,
					revision: response.revision,
					segmentedContent: response.content,
					categories: response.categories
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
	 * @param {Request} req request object
	 * @param {Response} res response object
	 * @return {Promise}
	 */
	translate( req, res ) {
		var mtClient, sourceHtml, machineTranslationRequest,
			from = req.params.from,
			to = req.params.to,
			provider = req.params.provider;

		if ( provider ) {
			mtClient = this.getMTClient( req, res );
			if ( !mtClient ) {
				// With explicit provider, if not MT Client found, it is an error.
				return res.status( 500 )
					.end( `Given MT provider ${provider} not found for the given language pairs` );
			}
		}

		sourceHtml = req.body.html;

		if ( !sourceHtml || sourceHtml.trim().length === 0 ) {
			res.status( 500 ).end( 'Content for translate is not given or is empty' );
			return;
		}

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
					this.app.metrics.increment( `translate.${provider || 'source'}.200` );
				}, ( error ) => {
					res.status( 500 ).end( error.stack );
					this.app.metrics.increment( `translate.${provider || 'source'}.500` );
					this.app.logger.log( 'error', `MT processing error for: ${from} > ${to}. ` +
						`${error.stack}` );
				} );
		} );
	}

	/**
	 * Suggest a source article to use for creating given
	 * article in given target language using translation
	 *
	 * @param {Request} req Request object
	 * @param {Response} res Response object
	 * @return {Promise} Promise that resolves as array of source title information objects.
	 *   In each object, title, language, pageid, description, thumbnail, pageprops can be expected.
	 */
	async suggestSource( req, res ) {
		let sourceLanguages = req.query.sourcelanguages;
		if ( sourceLanguages ) {
			sourceLanguages = sourceLanguages.split( new RegExp( '[,\\s\\n]', 'g' ) );
		}

		const api = new MWApiRequestManager( this.app );

		// Finding a suitable source article requires a lot of API hits, sometimes
		// machine translation requests too. Make sure we don't do it for too many languages.
		if ( sourceLanguages && sourceLanguages.length > 5 ) {
			res.status( 500 ).end( 'Too many source language candidates. Maximum 5 allowed.' );
			return;
		}

		// Callback method for getting a valid MT engine for a language pair
		const mtProviderFactory = ( from, to ) => {
			const provider = this.registry.getValidProvider( from, to, 'mt' );
			const mtClients = require( __dirname + '/../mt/' );
			if ( !provider ) {
				return null;
			}
			const mtClient = new mtClients[ provider ]( this.app );
			if ( mtClient.requiresAuthorization() ) {
				if ( !req.headers || !req.headers.authorization ) {
					return null;
				}
				try {
					jwt.verify(
						req.headers.authorization,
						this.app.conf.jwt.secret,
						{ algorithms: this.app.conf.jwt.algorithms }
					);
				} catch ( err ) {
					// Ignore error. Just don't provide this MT engine
					return null;
				}
			}
			return mtClient;
		};

		const suggestions = await new SourceSuggester(
			req.params.to,
			req.params.title,
			{
				sourceLanguages,
				api,
				context: this.app,
				mtProviderFactory
			}
		).suggest();

		return res.json( { suggestions } );
	}

	static create( appObj ) {
		const registry = new CXConfig( appObj );
		const routes = new RoutesV2( appObj, registry );
		return {
			path: '/v2/',
			// eslint-disable-next-line camelcase
			api_version: 2,
			router: routes.router,
			// eslint-disable-next-line camelcase
			skip_domain: true
		};
	}
}

module.exports = RoutesV2;
