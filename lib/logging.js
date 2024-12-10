import { createLogger, format as logFormat, transports as logTransports } from 'winston';
import { ecsFormat } from '@elastic/ecs-winston-format';

/**
 * @param {string} serviceName Name of the service. Added to default metadata of the logger.
 * @param {Object} options WinstonLoggerOptions, not to be confused with winston.LoggerOptions
 * @return {winston.Logger}
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

	return createLogger( {
		level: options.level,
		format: logFormat.combine(
			// Enable stacktrace for errors
			logFormat.errors( { stack: options.stacktrace } ),
			options.format === 'ecs' ?
				ecsFormat( options.formatOptions ) :
				logFormat[ options.format || 'json' ](
					options.format ? options.formatOptions : undefined
				)
		),
		defaultMeta: {
			service: serviceName
		},
		transports: ( options.transports || [] ).map(
			( { transport, options: transportOptions } ) => new logTransports[ transport ]( {
				...transportOptions,
				// Spread format separately so we can add on options as parameters
				...( transportOptions && transportOptions.format ?
					{
						format: logFormat.combine(
							logFormat.errors( { stack: options.stacktrace } ),
							transportOptions.format === 'ecs' ?
								ecsFormat( transportOptions.formatOptions ) :
								logFormat[ transportOptions.format ](
									transportOptions.formatOptions
								)
						)
					} :
					{} )
			} )
		)
	} );
};

export const logger = createWinstonLogger;
