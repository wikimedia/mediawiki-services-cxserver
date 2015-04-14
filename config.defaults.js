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
		source: [ 'af', 'an', 'ar', 'ast', 'az', 'ba', 'bg', 'bs', 'ca', 'cr', 'cv', 'cy', 'en', 'eo', 'es', 'eu', 'fr', 'gl', 'gu', 'hi', 'hr', 'id', 'ja', 'kk', 'km', 'kn', 'koi', 'kv', 'ky', 'kz', 'lez', 'min', 'mk', 'ms', 'mt', 'nl', 'no', 'nn', 'oc', 'pa', 'pl', 'pt', 'ru', 'sah', 'sh', 'simple', 'sl', 'tr', 'tt', 'tyv', 'udm', 'uk', 'ur', 'uz', 'vi', 'xh', 'zh', 'zu' ],
		target: [ 'af', 'an', 'ar', 'ast', 'az', 'ba', 'bg', 'bs', 'ca', 'cr', 'cv', 'cy', 'eo', 'es', 'eu', 'fr', 'gl', 'gu', 'hi', 'hr', 'id', 'ja', 'kk', 'km', 'kn', 'koi', 'kv', 'ky', 'kz', 'lez', 'min', 'mk', 'ms', 'mt', 'nl', 'no', 'nn', 'oc', 'pa', 'pl', 'pt', 'ru', 'sah', 'sh', 'simple', 'sl', 'tt', 'tr', 'tyv', 'udm', 'uk', 'ur', 'uz', 'vi', 'xh', 'zh', 'zu' ],
		mt: {
			Apertium: {
				af: [ 'nl' ],
				ar: [ 'mt' ],
				an: [ 'es' ],
				ast: [ 'es' ],
				bg: [ 'mk' ],
				br: [ 'fr' ],
				ca: [ 'es', 'en', 'eo', 'fr', 'oc', 'pt' ],
				cy: [ 'en' ],
				en: [ 'bs', 'ca', 'cr', 'eo', 'es', 'gl', 'hr', 'sh', 'sr' ],
				eo: [ 'en' ],
				es: [ 'an', 'ast', 'ca', 'en', 'eo', 'fr', 'gl', 'it', 'oc', 'pt' ],
				eu: [ 'en', 'es' ],
				fr: [ 'ca', 'eo', 'es' ],
				gl: [ 'en', 'es', 'pt' ],
				hi: [ 'ur' ],
				id: [ 'ms' ],
				is: [ 'en' ],
				kk: [ 'tt' ],
				mk: [ 'bg', 'bs', 'hr', 'sh', 'sr' ],
				ms: [ 'id' ],
				mt: [ 'ar' ],
				no: [ 'da', 'nn' ],
				nl: [ 'af' ],
				nn: [ 'da', 'no' ],
				oc: [ 'es', 'ca' ],
				pt: [ 'ca', 'es', 'gl' ],
				ro: [ 'es' ],
				sh: [ 'mk', 'sl' ],
				simple: [ 'bs', 'ca', 'cr', 'eo', 'es', 'gl', 'hr', 'sh', 'sr' ],
				sl: [ 'bs', 'cr', 'hr', 'sh', 'sr' ],
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
				ca: [ 'es', 'en' ],
				es: [ 'ca' ]
			}
		}
	}
};
