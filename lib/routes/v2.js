'use strict';

const languageData = require( 'language-data' ),
	MWPageLoader = require( '../mw/MWPageLoader' ),
	CXConfig = require( '../Config' ),
	RoutesV1 = require( './v1' ),
	MWApiRequestManager = require( '../../lib/mw/ApiRequestManager' );

class RoutesV2 extends RoutesV1 {
	/**
	 * route definitions
	 */
	get routes() {
		return {
			'/': this.getSpec,
			'/page/:language/:title/:revision?': this.fetchPage,
			'POST /mt/:from/:to/:provider?': this.machineTranslate,
			'/dictionary/:word/:from/:to/:provider?': this.dictionary,
			'/list/tool/:tool': this.listTool,
			'/list/pair/:from/:to': this.listToolForLanguagePair,
			'/list/languagepairs': this.listLanguagePairs,
			'/list/:tool/:from?/:to?': this.listToolForLanguagePairsAndTool,
			'POST /translate/:from/:to/:provider?': this.translate
		};
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
		return pageLoader.getPage( title, revision, true /* wrapSections */ ).then(
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
				}, ( error ) => {
					res.status( 500 ).end( error.stack );
					this.app.logger.log( 'error', 'MT processing error: ' + error.stack );
				} );
		} );
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
