var
	express = require( 'express' ),
	jwt = require('jsonwebtoken'),
	conf = require( __dirname + '/../utils/Conf.js' ),
	logger = require( __dirname + '/../utils/Logger.js' ),
	registry = require( __dirname + '/../registry' ),
	pkg = require( __dirname + '/../package.json' ),
	app = express();

app.get( '/page/:language/:title', function ( req, res ) {
	var sourceLanguage = req.params.language,
		title = req.params.title,
		CXSegmenter = require( __dirname + '/../segmentation/CXSegmenter.js' ).CXSegmenter,
		PageLoader = require( __dirname + '/../pageloader/PageLoader.js' ).PageLoader,
		pageloader = new PageLoader( title, sourceLanguage );

	pageloader.load().then(
		function ( response ) {
			var segmenter, segmentedContent;
			try {
				logger.debug( 'Fetch page', {
					title: title,
					sourceLanguage: sourceLanguage
				} );
				segmenter = new CXSegmenter( response.body, sourceLanguage );
				segmenter.segment();
				segmentedContent = segmenter.getSegmentedContent();
				logger.debug( 'Segment page', {
					title: title,
					sourceLanguage: sourceLanguage
				} );
			} catch ( error ) {
				res.send( 500, {
					error: '' + error
				} );
				logger.log( 'error', 'Page %s:%s could not be fetched or segmented: (%s)',
					sourceLanguage, title, error.toString() );
			}
			res.send( {
				sourceLanguage: sourceLanguage,
				title: title,
				revision: response.revision,
				segmentedContent: segmentedContent
			} );
			logger.debug( 'Page sent' );
		},
		function ( error ) {
			res.send( 404, {
				error: '' + error
			} );
			logger.info( 'Page not found: %s:%s', sourceLanguage, title );
		}
	);
} );

app.get( '/mt/:from/:to/:provider?', function ( req, res ) {
	res.send( 405, {
		error: 'Request must be posted'
	} );
} );

app.post( '/mt/:from/:to/:provider?', function ( req, res ) {
	var mtClients, mtClient,
		sourceHtmlChunks, sourceHtml, reqLength,
		authzToken, authz, jwtConfig
		from = req.params.from,
		to = req.params.to,
		provider = registry.getValidProvider( from, to, 'mt', req.params.provider );

	if ( !provider ) {
		res.send( 404, {
			error: 'Provider not supported'
		} );
		logger.info( 'MT provider invalid or missing' );

		return;
	}

	mtClients = require( __dirname + '/../mt/' );
	if ( mtClients[ provider ] === undefined ) {
		res.send( 500, {
			error: 'Provider not found'
		} );
		logger.error( 'Configured provider ' + provider + ' was not found' );
		return;
	}

	mtClient = new mtClients[ provider ]();

	if ( mtClient.requiresAuthorization() ) {
		if ( !req.headers || !req.headers.authorization ) {
			res.send( 403, {
				error: 'Authorization header is missing'
			} );
			return;
		}

		authzToken = req.headers.authorization;
		jwtConfig = conf( 'jwt' );

		try {
			authz = jwt.verify(
				authzToken,
				jwtConfig.secret,
				{ algorithms: jwtConfig.algorithms }
			);
		} catch ( err ) {
			res.send( 403, {
				error: 'Authorization header is not valid: ' + err
			} );
			return;
		}
	}

	sourceHtmlChunks = [ '<div>' ];
	reqLength = 0;

	req.on( 'data', function ( data ) {
		reqLength += data.length;
		if ( reqLength > 50000 ) {
			// Too long
			res.send( 413, {
				error: 'Content too long'
			} );
			logger.error( 'MT content too long' );
			return;
		}
		sourceHtmlChunks.push( data );
	} );
	req.on( 'end', function () {
		sourceHtmlChunks.push( '</div>' );
		sourceHtml = sourceHtmlChunks.join( '' );

		mtClient.translate( from, to, sourceHtml ).then(
			function ( data ) {
				// Prevent XSS by sending json with
				// dangerous characters converted to
				// unicode sequences
				var json = JSON.stringify( {
					contents: data
				} );
				json = json
					.replace( /&/g, '\\u0026' )
					.replace( /</g, '\\u003C' )
					.replace( />/g, '\\u003E' );
				res.type( 'application/json' );
				res.send( json );
				logger.debug( 'MT', {
					from: from,
					to: to
				} );
			},
			function ( error ) {
				res.send( 500, {
					error: error
				} );
				logger.log( 'error', 'MT processing error: (%s)', error.toString() );
			}
		);
	} );
} );

app.get( '/dictionary/:word/:from/:to/:provider?', function ( req, res ) {
	var dictClients, dictClient,
		word = req.params.word,
		from = req.params.from,
		to = req.params.to,
		provider = registry.getValidProvider( from, to, 'dictionary', req.params.provider );

	if ( !provider ) {
		res.send( 404 );
		logger.info( 'Dictionary provider invalid or missing' );

		return;
	}

	dictClients = require( __dirname + '/../dictionary/' );
	dictClient = dictClients[ provider ];

	dictClient.getTranslations( word, from, to ).then(
		function ( data ) {
			res.send( data );
			logger.debug( 'Dictionary lookup', {
				word: word,
				from: from,
				to: to
			} );
		},
		function ( error ) {
			res.send( 500, {
				error: error
			} );
			logger.log( 'error', 'Dictionary lookup error: (%s)', error.toString() );
		}
	);
} );

app.get( '/list/:tool/:from/:to', function ( req, res ) {
	var result = {},
		tool = req.params.tool,
		from = req.params.from,
		to = req.params.to,
		toolset = registry.getToolSet( from, to );

	if ( toolset[ tool ] ) {
		result[ tool ] = toolset[ tool ];
		result[ 'default' ] = toolset.default;
	}
	res.json( result );
	logger.debug( 'Tool data sent' );
} );

app.get( '/languagepairs', function ( req, res ) {
	res.json( registry.getLanguagePairs() );
} );

app.get( '/version', function ( req, res ) {
	var version = {
		name: pkg.name,
		version: pkg.version
	};
	res.json( version );
	logger.debug( 'Version info sent' );
} );

module.exports = app;
