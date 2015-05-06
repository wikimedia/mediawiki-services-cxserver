var bunyan = require( 'bunyan' ),
	gelfStream = require( 'gelf-stream' ),
	conf = require( __dirname + '/Conf.js' ),
	logger;

function processConf( conf ) {
	if ( Array.isArray( conf.streams ) ) {
		var streams = [];
		conf.streams.forEach( function ( stream ) {
			if ( stream.type === 'gelf' ) {
				// Convert the 'gelf' logger type to a real logger
				streams.push( {
					type: 'raw',
					level: stream.level,
					stream: gelfStream.forBunyan( stream.host,
						stream.port, stream.options )
				} );
			} else {
				streams.push( stream );
			}
		} );
		conf.streams = streams;
	}
	return conf;
}

logger = bunyan.createLogger( processConf( conf( 'logging' ) ) );

module.exports = logger;
