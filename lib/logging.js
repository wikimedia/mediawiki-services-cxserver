'use strict';

const winston = require( 'winston' );
const { ecsFormat } = require( '@elastic/ecs-winston-format' );

/**
 * @param serviceName Name of the service. Added to default metadata of the logger.
 * @param options WinstonLoggerOptions, not to be confused with winston.LoggerOptions
 * @return
 */
const createWinstonLogger = ( serviceName, options = {} ) => {
	// Uses spread operator to fill options
	// with defaults first and then override with config
	options = {
		...{
			level: 'info',
			stacktrace: true,
			format: 'json',
			transports: [ { transport: 'Console' } ]
		},
		...options
	};

	return winston.createLogger( {
		level: options.level,
		format: winston.format.combine(
			// Enable stacktrace for errors
			winston.format.errors( { stack: options.stacktrace } ),
			options.format === 'ecs' ?
				ecsFormat( options.formatOptions ) :
				winston.format[ options.format || 'json' ](
					options.format ? options.formatOptions : undefined
				)
		),
		defaultMeta: {
			service: serviceName
		},
		transports: ( options.transports || [] ).map(
			( { transport, options: transportOptions } ) => new winston.transports[ transport ]( {
				...transportOptions,
				// Spread format separately so we can add on options as parameters
				...( transportOptions && transportOptions.format ?
					{
						format: winston.format.combine(
							winston.format.errors( { stack: options.stacktrace } ),
							transportOptions.format === 'ecs' ?
								ecsFormat( transportOptions.formatOptions ) :
								winston.format[ transportOptions.format ](
									transportOptions.formatOptions
								)
						)
					} :
					{} )
			} )
		)
	} );
};

exports.logger = createWinstonLogger;
