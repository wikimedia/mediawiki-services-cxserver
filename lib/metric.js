import Prometheus from 'prom-client';

class PrometheusClient {
	constructor( options, logger ) {
		this.options = options;
		this.logger = logger;
		this.client = Prometheus;
		if ( this.options.collectDefaultMetrics ) {
			this.client.collectDefaultMetrics();
		}
		this.client.register.setDefaultLabels( this.options.staticLabels );
	}

	/**
	 * Normalizes a prometheus string. Should be used for label
	 * and metric names, but is not needed for label values.
	 *
	 * @param {string} str
	 * @return {string}
	 */
	normalize( str ) {
		return String( str )
			.replace( /\W/g, '_' ) // replace non-alphanumerics
			.replace( /_+/g, '_' ) // dedupe underscores
			.replace( /(^_+|_+$)/g, '' ); // trim leading and trailing underscores
	}

	makeMetric( options ) {
		const normalisedName = this.normalize( options.name );
		let metric = this.client.register.getSingleMetric( normalisedName );
		if ( metric ) {
			return metric;
		}

		let labelNames = [ normalisedName ];
		if ( options.labels?.names ) {
			labelNames = labelNames.concat( options.labels.names );
		}

		metric = new this.client[ options.type ]( {
			name: normalisedName,
			help: options.help,
			labelNames,
			buckets: options.buckets,
			percentiles: options.percentiles
		} );

		if ( options.type !== 'Histogram' ) {
			metric.labels( labelNames );
		}
		// Alias inc to increment for compatibility with existing code
		metric.increment = metric.inc;

		this.client.register.registerMetric( metric );
		return metric;
	}

	metrics() {
		return this.client.register.metrics();
	}

	close() { }
}

export default PrometheusClient;
