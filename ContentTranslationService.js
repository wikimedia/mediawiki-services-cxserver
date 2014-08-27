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
	conf = require( __dirname + '/utils/Conf.js' ),
	logger = require( __dirname + '/utils/Logger.js' ),
	privateKey,
	certificate,
	credentials,
	pkg = require( __dirname + '/package.json' );

app = express();
// Starts https server only if all needed args provided, else starts http server.
if ( conf( 'secure' ) && conf( 'sslkey' ) && conf( 'cert' ) ) {
	privateKey = fs.readFileSync( conf( 'sslkey' ), 'utf8' );
	certificate = fs.readFileSync( conf( 'cert' ), 'utf8' );
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

app.post( '/mt/:from/:to/:provider?', function ( req, res ) {
	var mtClients, mtClient,
		sourceHtmlChunks, sourceHtml, reqLength,
		registry = require( __dirname + '/registry' ),
		from = req.params.from,
		to = req.params.to,
		provider = registry.getValidProvider( from, to, 'mt', req.params.provider );

	if ( !provider ) {
		res.send( 404 );

		return;
	}

	mtClients = require( __dirname + '/mt/' );
	mtClient = mtClients[ provider ];

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
		mtClient.translate( from, to, sourceHtml ).then(
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

app.get( '/dictionary/:word/:from/:to/:provider?', function ( req, res ) {
	var dictClients, dictClient,
		registry = require( __dirname + '/registry' ),
		word = req.params.word,
		from = req.params.from,
		to = req.params.to,
		provider = registry.getValidProvider( from, to, 'dictionary', req.params.provider );

	if ( !provider ) {
		res.send( 404 );

		return;
	}

	dictClients = require( __dirname + '/dictionary/' );
	dictClient = dictClients[ provider ];

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
console.log( instanceName + ' ready. Listening on port: ' + conf( 'port' ) );
server.listen( conf( 'port' ) );

module.exports = app;
