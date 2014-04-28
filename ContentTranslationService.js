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

var instanceName, context, port, app, server, io, fs, redis, express,
	 RedisStore, logger, args, privateKey, certificate, credentials;

logger = require( __dirname + '/utils/Logger.js' );
express = require( 'express' );
fs = require( 'fs' );
args = require( 'minimist' )( process.argv.slice( 2 ) );
port = args.port || 8000;
app = express();

// Starts https server only if all needed args provided, else starts http server.
if ( args.secure && args.key && args.cert ) {
	privateKey  = fs.readFileSync( args.key, 'utf8' );
	certificate = fs.readFileSync( args.cert, 'utf8' );
	credentials = { key: privateKey, cert: certificate };
	server = require( 'https' ).createServer( credentials, app );
} else {
	server = require( 'http' ).createServer( app );
}

io = require( 'socket.io' ).listen( server, {
	logger: {
		debug: logger.debug,
		info: logger.info,
		error: logger.error,
		warn: logger.warn
	}
} );

// Production log configuration.
io.configure( 'production', function () {
	io.set( 'log level', 1 ); // reduce logging
	io.enable( 'browser client minification' ); // send minified client
	io.enable( 'browser client etag' ); // apply etag caching logic based on version number
	io.enable( 'browser client gzip' ); // gzip the file

	// enable all transports
	io.set( 'transports', [
		'websocket',
		'flashsocket',
		'htmlfile',
		'xhr-polling',
		'jsonp-polling'
	] );
} );

// Development log configuration.
io.configure( 'development', function () {
	io.enable( 'browser client gzip' ); // gzip the file, reduce the log size
	io.set( 'transports', [ 'websocket' ] );
} );

redis = require( 'redis' );
// Use Redis as the store for socket.io
RedisStore = require( 'socket.io/lib/stores/redis' );
io.set( 'store',
	new RedisStore( {
		redisPub: redis.createClient(),
		redisSub: redis.createClient(),
		redisClient: redis.createClient()
	} )
);
instanceName = 'worker(' + process.pid + ')';
// socket.io connection establishment
io.sockets.on( 'connection', function ( socket ) {
	var dataModelManager,
		CXDataModelManager,
		redisSub = redis.createClient();

	logger.debug( 'Client connected to ' + instanceName + '. Socket: ' + socket.id );
	redisSub.subscribe( 'cx' );
	redisSub.on( 'message', function ( channel, message ) {
		socket.emit( 'cx.data.update', JSON.parse( message ) );
		logger.debug( 'Received from channel #' + channel + ':' + message );
	} );

	socket.on( 'cx.init', function ( data ) {
		CXDataModelManager = require( __dirname + '/models/DataModelManager.js' ).CXDataModelManager;
		context = {
			sourceLanguage: data.sourceLanguage,
			targetLanguage: data.targetLanguage,
			sourcePage: data.sourcePage,
			pub: redis.createClient(),
			store: redis.createClient()
		};
		// Inject the session context to dataModelManager
		// It should take care of managing the data model and pushing
		// it to the client through socket.
		dataModelManager = new CXDataModelManager( context );
	} );

	socket.on( 'disconnect', function () {
		logger.debug( 'Disconnecting from redis' );
		redisSub.quit();
	} );

} );

// Everything else goes through this.
app.use( express.static( __dirname + '/public' ) );
logger.info( instanceName + ' ready. Listening on port: ' + port );
server.listen( port );

module.exports = app;
