var winston = require( 'winston' ),
	fs = require( 'fs' ),
	logDir = 'log', // TODO: Make this configurable
	env = process.env.NODE_ENV || 'development',
	logger;

winston.setLevels( winston.config.npm.levels );
winston.addColors( winston.config.npm.colors );

if ( !fs.existsSync( logDir ) ) {
	fs.mkdirSync( logDir );
}

logger = new( winston.Logger )( {
	transports: [
		new winston.transports.Console( {
			level: 'warn', // Only write logs of warn level or higher
			colorize: true
		} ),
		new winston.transports.File( {
			level: env === 'development' ? 'debug' : 'info',
			filename: logDir + '/cx-logs.log',
			maxsize: 1024 * 1024 * 10 // 10MB
		} )
	],
	exceptionHandlers: [
		new winston.transports.File( {
			filename: 'log/exceptions.log'
		} )
	]
} );

module.exports = logger;
