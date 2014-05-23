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
	port = args.port || 8080,
	privateKey,
	certificate,
	credentials,
	pkg = require( __dirname + '/package.json' );

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

	pageloader.load().then( function ( data ) {
		var segmenter;

		logger.debug( 'Page fetched' );
		segmenter = new CXSegmenter( data );
		segmenter.segment();
		res.send( {
			sourceLanguage: sourceLanguage,
			title: title,
			segmentedContent: segmenter.getSegmentedContent(),
		} );
	}, function ( error ) {
		res.send( 500, {
			error: error
		} );
	} );
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
logger.info( instanceName + ' ready. Listening on port: ' + port );
server.listen( port );

module.exports = app;
