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
	credentials;

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
	logger.debug( 'Secure server created' );
} else {
	server = require( 'http' ).createServer( app );
	logger.debug( 'Server created' );
}

instanceName = 'worker(' + process.pid + ')';

app.use( function ( req, res, next ) {
	res.header( 'Access-Control-Allow-Origin', conf( 'allowCORS' ) );
	res.header( 'Access-Control-Allow-Headers', 'X-Requested-With, Authorization' );
	next();
} );

app.use( '/v1', require( './routes/v1' ) );
app.use( '/', require( './routes/v1' ) );

// Everything else goes through this.
app.use( express.static( __dirname + '/public' ) );

server.listen( conf( 'port' ) );

module.exports = app;
