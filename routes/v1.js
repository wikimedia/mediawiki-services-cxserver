'use strict';

var app, HTTPError, router,
	sUtil = require( '../utils/util' ),
	jwt = require( 'jsonwebtoken' ),
	registry;

// shortcut
HTTPError = sUtil.HTTPError;

/**
 * The main router object
 */
router = sUtil.router();

router.get( '/page/:language/:title', function ( req, res ) {
	var sourceLanguage = req.params.language,
		title = req.params.title,
		CXSegmenter = require( __dirname + '/../segmentation/CXSegmenter.js' ).CXSegmenter,
		PageLoader = require( __dirname + '/../pageloader/PageLoader.js' ).PageLoader,
		pageloader = new PageLoader( app );

	return pageloader.load( title, sourceLanguage ).then(
		function ( response ) {
			var segmenter, segmentedContent;

			try {
				app.logger.log( 'debug', 'Fetch page', {
					title: title,
					sourceLanguage: sourceLanguage
				} );
				segmenter = new CXSegmenter( response.body, sourceLanguage );
				segmenter.segment();
				segmentedContent = segmenter.getSegmentedContent();
				app.logger.log( 'debug', 'Segment page', {
					title: title,
					sourceLanguage: sourceLanguage
				} );
			} catch ( error ) {
				res.status( 500 ).end( 'Page ' + sourceLanguage + ':' +
					title + ' could not be fetched or segmented: ' + error.toString() );
			}
			res.send( {
				sourceLanguage: sourceLanguage,
				title: title,
				revision: response.revision,
				segmentedContent: segmentedContent
			} );
			app.logger.log( 'debug', 'Page sent' );
		},
		function ( error ) {
			res.status( 404 ).end( 'Page ' + sourceLanguage + ':' + title + ' could not be found. ' + error.toString() );
		}
	);
} );

router.get( '/mt/:from/:to/:provider?', function ( req, res ) {
	res.status( 405 ).end( 'Request must be posted' );
} );

router.post( '/mt/:from/:to/:provider?', function ( req, res ) {
	var mtClients, mtClient, provider,
		authzToken, authz, jwtConfig, sourceHtml,
		from = req.params.from,
		to = req.params.to;

	registry = require( __dirname + '/../registry' )( app );
	provider = registry.getValidProvider( from, to, 'mt', req.params.provider );

	if ( !provider ) {
		res.status( 404 ).end( 'Provider not supported' );
		return;
	}

	mtClients = require( __dirname + '/../mt/' );
	if ( mtClients[ provider ] === undefined ) {
		res.status( 500 ).end( 'Provider not found' );
		return;
	}

	mtClient = new mtClients[ provider ]( app );

	if ( mtClient.requiresAuthorization() ) {
		if ( !req.headers || !req.headers.authorization ) {
			res.status( 403 ).end( 'Authorization header is missing' );
			return;
		}

		authzToken = req.headers.authorization;
		jwtConfig = app.conf.jwt;

		try {
			authz = jwt.verify( authzToken, jwtConfig.secret, {
				algorithms: jwtConfig.algorithms
			} );
		} catch ( err ) {
			res.status( 403 ).end( 'Authorization header is not valid: ' + err );
			return;
		}
	}

	// We support setting html as body or as body.html. But body.html is the recommended way.
	// The other way will be removed soon.
	sourceHtml = [ '<div>', req.body.html || req.rawBody, '</div>' ].join( '' );
	return mtClient.translate( from, to, sourceHtml ).then(
		function ( data ) {
			res.json( {
				contents: data
			} );
		},
		function ( error ) {
			res.status( 500 ).end( error.toString() );
			app.logger.log( 'error', 'MT processing error: ' + error.stack );
		}
	);
} );

router.get( '/dictionary/:word/:from/:to/:provider?', function ( req, res ) {
	var dictClients, provider, dictClient,
		word = req.params.word,
		from = req.params.from,
		to = req.params.to;

	registry = require( __dirname + '/../registry' )( app );
	provider = registry.getValidProvider( from, to, 'dictionary', req.params.provider );

	if ( !provider ) {
		res.status( 404 ).end( 'Dictionary provider invalid or missing' );
		return;
	}

	dictClients = require( __dirname + '/../dictionary/' );
	dictClient = new dictClients[ provider ]( app );

	return dictClient.getTranslations( word, from, to ).then(
		function ( data ) {
			res.send( data );
		},
		function ( error ) {
			res.status( 500 ).end( error.toString() );
			app.logger.log( 'error', 'Dictionary lookup error: (%s)', error.toString() );
		}
	);
} );

router.get( '/list/:tool/:from?/:to?', function ( req, res ) {
	var toolset, result = {},
		tool = req.params.tool,
		from = req.params.from,
		to = req.params.to;

	registry = require( __dirname + '/../registry' )( app );
	if ( from && to ) {
		toolset = registry.getToolSet( from, to );
		result[ tool ] = toolset[ tool ];
		result[ 'default' ] = toolset.default;
	} else if ( tool ) {
		if ( tool === 'mt' ) {
			result = registry.getMTPairs();
		}
		if ( tool === 'dictionary' ) {
			result = registry.getDictionaryPairs();
		}
	}
	res.json( result );
} );

/**
 * Get a list of all language pairs.
 */
router.get( '/languagepairs', function ( req, res ) {
	registry = require( __dirname + '/../registry' )( app );
	res.json( registry.getLanguagePairs() );
} );

module.exports = function ( appObj ) {
	app = appObj;
	return {
		path: '/v1/',
		api_version: 1,
		router: router,
		skip_domain: true
	};
};
