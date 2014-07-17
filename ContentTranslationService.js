/**
 * ContentTranslation server
 *
 * @file
 * @copyright See AUTHORS.txt
 * @license GPL-2.0+
 */

/**
 * @class ContentTranslationService
 * @singleton
 * @private
 */

'use strict';

var instanceName,
	server,
	fs = require( 'fs' ),
	express = require( 'express' ),
	app = express(),
	logger = require( __dirname + '/utils/Logger.js' ),
	args = require( 'minimist' )( process.argv.slice( 2 ) ),
	port = args.port,
	privateKey,
	certificate,
	credentials,
	pkg = require( __dirname + '/package.json' );

if ( !port ) {
	try {
		port = require( __dirname + '/config.js' ).port;
	} catch ( e ) {
		port = 8080;
	}
}

app = express();
// Starts https server only if all needed args provided, else starts http server.
if ( args.secure && args.key && args.cert ) {
	privateKey = fs.readFileSync( args.key, 'utf8' );
	certificate = fs.readFileSync( args.cert, 'utf8' );
	credentials = {
		key: privateKey,
		cert: certificate
	};
	server = require( 'https' ).createServer( credentials, app );
} else {
	server = require( 'http' ).createServer( app );
}

instanceName = 'worker(' + process.pid + ')';
app.use( function ( req, res, next ) {
	res.header( 'Access-Control-Allow-Origin', '*' );
	res.header( 'Access-Control-Allow-Headers', 'X-Requested-With' );
	next();
} );

app.get( '/page/:language/:title', function ( req, res ) {
	var sourceLanguage = req.params.language,
		title = req.params.title,
		CXSegmenter = require( __dirname + '/segmentation/CXSegmenter.js' ).CXSegmenter,
		PageLoader = require( __dirname + '/pageloader/PageLoader.js' ).PageLoader,
		pageloader = new PageLoader( title, sourceLanguage );

	pageloader.load().then(
		function ( data ) {
			var segmenter, segmentedContent;
			try {
				logger.debug( 'Page fetched' );
				segmenter = new CXSegmenter( data, sourceLanguage );
				segmenter.segment();
				segmentedContent = segmenter.getSegmentedContent();
			} catch ( error ) {
				res.send( 500, {
					error: '' + error
				} );
			}
			res.send( {
				sourceLanguage: sourceLanguage,
				title: title,
				segmentedContent: segmentedContent
			} );
		},
		function ( error ) {
			res.send( 404, {
				error: '' + error
			} );
		}
	);
} );

app.post( '/mt/:sourceLang/:targetLang', function ( req, res ) {
	var mtProviders, mtClient, sourceHtmlChunks, sourceHtml, reqLength,
		sourceLang = req.params.sourceLang,
		targetLang = req.params.targetLang,
		registry = require( __dirname + '/registry' ),
		toolset;

	toolset = registry.getToolSet( sourceLang, targetLang );
	if ( !toolset.mt ) {
		res.send( 404 );
		return;
	}
	mtProviders = require( __dirname + '/mt' );
	mtClient = mtProviders[ toolset.mt.provider ];

	sourceHtmlChunks = [ '<div>' ];
	reqLength = 0;
	req.on( 'data', function ( data ) {
		reqLength += data.length;
		if ( reqLength > 50000 ) {
			// Too long
			res.send( 500 );
			return;
		}
		sourceHtmlChunks.push( data );
	} );
	req.on( 'end', function () {
		sourceHtmlChunks.push( '</div>' );
		sourceHtml = sourceHtmlChunks.join( '' );
		mtClient.translateHtmlWithNativeMarkup( sourceLang, targetLang, sourceHtml ).then(
			function ( data ) {
				res.send( data );
			},
			function ( error ) {
				res.send( 500, {
					error: error
				} );
			}
		);
	} );
} );

app.get( '/dictionary/:word/:from/:to', function ( req, res ) {
	var from = req.params.from,
		word = req.params.word,
		to = req.params.to,
		dictClient, dictionaryProviders,
		registry = require( __dirname + '/registry' ),
		toolset;

	toolset = registry.getToolSet( from, to );
	if ( !toolset.dictionary ) {
		res.send( 404 );
		return;
	}
	dictionaryProviders = require( __dirname + '/dictionary' );
	dictClient = dictionaryProviders[ toolset.dictionary.provider ];
	dictClient.getTranslations( word, from, to ).then(
		function ( data ) {
			res.send( data );
		},
		function ( error ) {
			res.send( 500, {
				error: error
			} );
		}
	);
} );

app.get( '/list/:tool/:from/:to', function ( req, res ) {
	var tool = req.params.tool,
		from = req.params.from,
		to = req.params.to,
		registry = require( __dirname + '/registry' ),
		toolset = registry.getToolSet( from, to );
	res.json( toolset[ tool ] || {} );
} );

app.get( '/version', function ( req, res ) {
	var version = {
		name: pkg.name,
		version: pkg.version
	};
	res.json( version );
} );
// Everything else goes through this.
app.use( express.static( __dirname + '/public' ) );
console.log( instanceName + ' ready. Listening on port: ' + port );
server.listen( port );

module.exports = app;
