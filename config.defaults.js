'use strict';

module.exports = {
	// CX Server port
	port: 8080,
	proxy: null,
	// Log directory
	logDir: 'log',
	// Accept requests from the given domains. * for all domains.
	allowCORS: '*',
	// Parsoid API URL
	'parsoid.api': 'http://parsoid-lb.eqiad.wikimedia.org',
	// Apertium web API URL
	'mt.apertium.api': 'http://apertium.wmflabs.org',
	'mt.yandex.api': 'https://translate.yandex.net',
	'mt.yandex.key': null,
	// Use SSL?
	secure: false,
	// SSL key filename
	sslkey: null,
	// SSL cert filename
	cert: null,
	// Service registry
	registry: {
		source: [ 'af', 'an', 'ar', 'bg', 'bs', 'ca', 'cr', 'cy', 'en', 'eo', 'es', 'fr', 'gl', 'hi', 'hr', 'id', 'ja', 'kk', 'km', 'ky', 'min', 'mk', 'ms', 'mt', 'nl', 'no', 'nn', 'oc', 'pl', 'pt', 'ru', 'tr', 'tt', 'ur', 'uz', 'zh' ],
		target: [ 'af', 'an', 'ar', 'bg', 'bs', 'ca', 'cr', 'cy', 'eo', 'es', 'fr', 'gl', 'hi', 'hr', 'id', 'ja', 'kk', 'km', 'ky', 'min', 'mk', 'ms', 'mt', 'nl', 'no', 'nn', 'oc', 'pl', 'pt', 'ru', 'tt', 'tr', 'ur', 'uz', 'zh' ],
		mt: {
			Apertium: {
				af: [ 'nl' ],
				ar: [ 'mt' ],
				an: [ 'es' ],
				bg: [ 'mk' ],
				br: [ 'fr' ],
				ca: [ 'es', 'en', 'eo', 'fr', 'oc', 'pt' ],
				cy: [ 'en' ],
				en: [ 'bs', 'ca', 'cr', 'eo', 'es', 'gl', 'hr', 'sr' ],
				eo: [ 'en' ],
				es: [ 'an', 'ca', 'en', 'eo', 'fr', 'gl', 'it', 'oc', 'pt' ],
				eu: [ 'en' ],
				fr: [ 'ca', 'eo', 'es' ],
				gl: [ 'en', 'es', 'pt' ],
				hi: [ 'ur' ],
				id: [ 'ms' ],
				is: [ 'en' ],
				kk: [ 'tt' ],
				mk: [ 'bg', 'bs', 'hr', 'mk', 'sr' ],
				ms: [ 'id' ],
				mt: [ 'ar' ],
				no: [ 'da', 'nn' ],
				nl: [ 'af' ],
				nn: [ 'da', 'no' ],
				oc: [ 'es', 'ca' ],
				pt: [ 'ca', 'es', 'gl' ],
				ro: [ 'es' ],
				sh: [ 'sl' ],
				sl: [ 'bs', 'cr', 'hr', 'sr' ],
				sv: [ 'da', 'is' ],
				tt: [ 'kk' ],
				ur: [ 'hi' ]
			},
			Yandex: {
				en: [ 'ru' ]
			},
			defaults: {
				'en-ru': 'Yandex'
			}
		},
		dictionary: {
			JsonDict: {
				ca: 'es',
				es: 'ca'
			}
		}
	}
};
