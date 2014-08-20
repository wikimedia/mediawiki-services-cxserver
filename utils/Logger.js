var winston = require( 'winston' ),
	fs = require( 'fs' ),
	conf = require( __dirname + '/Conf.js' ),
	env = process.env.NODE_ENV || 'development',
	logger;

winston.setLevels( winston.config.npm.levels );
winston.addColors( winston.config.npm.colors );

if ( !fs.existsSync( conf( 'logDir' ) ) ) {
	fs.mkdirSync( conf( 'logDir' ) );
}

logger = new( winston.Logger )( {
	transports: [
		new winston.transports.Console( {
			level: 'warn', // Only write logs of warn level or higher
			colorize: true
		} ),
		new winston.transports.File( {
			level: env === 'development' ? 'debug' : 'info',
			filename: conf( 'logDir' ) + '/cx-logs.log',
			maxsize: 1024 * 1024 * 10 // 10MB
		} )
	],
	exceptionHandlers: [
		new winston.transports.File( {
			filename: conf( 'logDir' ) + '/exceptions.log'
		} )
	]
} );

module.exports = logger;
