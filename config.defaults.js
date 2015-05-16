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
	'restbase.url': 'https://@lang.wikipedia.org/api/rest_v1/page/html/@title',
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
		source: [ 'aa', 'ab', 'ace', 'af', 'ak', 'als', 'am', 'ang', 'an', 'arc', 'ar', 'arz', 'ast', 'as', 'av', 'ay', 'az', 'bar', 'bat-smg', 'ba', 'bcl', 'be-x-old', 'be', 'bg', 'bh', 'bi', 'bjn', 'bm', 'bn', 'bo', 'bpy', 'br', 'bs', 'bug', 'bxr', 'ca', 'cbk-zam', 'cdo', 'ceb', 'ce', 'cho', 'chr', 'ch', 'chy', 'ckb', 'co', 'crh', 'cr', 'csb', 'cs', 'cu', 'cv', 'cy', 'da', 'de', 'diq', 'dsb', 'dv', 'dz', 'ee', 'el', 'eml', 'en', 'eo', 'es', 'et', 'eu', 'ext', 'fa', 'ff', 'fiu-vro', 'fi', 'fj', 'fo', 'frp', 'frr', 'fr', 'fur', 'fy', 'gag', 'gan', 'ga', 'gd', 'glk', 'gl', 'gn', 'got', 'gu', 'gv', 'hak', 'ha', 'haw', 'he', 'hif', 'hi', 'ho', 'hr', 'hsb', 'ht', 'hu', 'hy', 'hz', 'ia', 'id', 'ie', 'ig', 'ii', 'ik', 'ilo', 'io', 'is', 'it', 'iu', 'ja', 'jbo', 'jv', 'kaa', 'kab', 'ka', 'kbd', 'kg', 'ki', 'kj', 'kk', 'kl', 'km', 'kn', 'koi', 'ko', 'krc', 'kr', 'ksh', 'ks', 'ku', 'kv', 'kw', 'ky', 'lad', 'la', 'lbe', 'lb', 'lez', 'lg', 'lij', 'li', 'lmo', 'ln', 'lo', 'ltg', 'lt', 'lv', 'mai', 'map-bms', 'mdf', 'mg', 'mhr', 'mh', 'min', 'mi', 'mk', 'ml', 'mn', 'mo', 'mrj', 'mr', 'ms', 'mt', 'mus', 'mwl', 'myv', 'my', 'mzn', 'nah', 'nap', 'na', 'nds-nl', 'nds', 'ne', 'new', 'ng', 'nl', 'nn', 'nov', 'no', 'nrm', 'nso', 'nv', 'ny', 'oc', 'om', 'or', 'os', 'pag', 'pam', 'pap', 'pa', 'pcd', 'pdc', 'pfl', 'pih', 'pi', 'pl', 'pms', 'pnb', 'pnt', 'ps', 'pt', 'qu', 'rm', 'rmy', 'rn', 'roa-rup', 'roa-tara', 'ro', 'rue', 'ru', 'rw', 'sah', 'sa', 'scn', 'sco', 'sc', 'sd', 'se', 'sg', 'sh', 'simple', 'si', 'sk', 'sl', 'sm', 'sn', 'so', 'sq', 'srn', 'sr', 'ss', 'stq', 'st', 'su', 'sv', 'sw', 'szl', 'ta', 'tet', 'te', 'tg', 'th', 'ti', 'tk', 'tl', 'tn', 'to', 'tpi', 'tr', 'ts', 'tt', 'tum', 'tw', 'tyv', 'ty', 'udm', 'ug', 'uk', 'ur', 'uz', 'vec', 'vep', 've', 'vi', 'vls', 'vo', 'war', 'wa', 'wo', 'wuu', 'xal', 'xh', 'xmf', 'yi', 'yo', 'za', 'zea', 'zh-classical', 'zh-min-nan', 'zh-yue', 'zh', 'zu' ],
		target: [ 'aa', 'ab', 'ace', 'af', 'ak', 'als', 'am', 'ang', 'an', 'arc', 'ar', 'arz', 'ast', 'as', 'av', 'ay', 'az', 'bar', 'bat-smg', 'ba', 'bcl', 'be-x-old', 'be', 'bg', 'bh', 'bi', 'bjn', 'bm', 'bn', 'bo', 'bpy', 'br', 'bs', 'bug', 'bxr', 'ca', 'cbk-zam', 'cdo', 'ceb', 'ce', 'cho', 'chr', 'ch', 'chy', 'ckb', 'co', 'crh', 'cr', 'csb', 'cs', 'cu', 'cv', 'cy', 'da', 'de', 'diq', 'dsb', 'dv', 'dz', 'ee', 'el', 'eml', 'en', 'eo', 'es', 'et', 'eu', 'ext', 'fa', 'ff', 'fiu-vro', 'fi', 'fj', 'fo', 'frp', 'frr', 'fr', 'fur', 'fy', 'gag', 'gan', 'ga', 'gd', 'glk', 'gl', 'gn', 'got', 'gu', 'gv', 'hak', 'ha', 'haw', 'he', 'hif', 'hi', 'ho', 'hr', 'hsb', 'ht', 'hu', 'hy', 'hz', 'ia', 'id', 'ie', 'ig', 'ii', 'ik', 'ilo', 'io', 'is', 'it', 'iu', 'ja', 'jbo', 'jv', 'kaa', 'kab', 'ka', 'kbd', 'kg', 'ki', 'kj', 'kk', 'kl', 'km', 'kn', 'koi', 'ko', 'krc', 'kr', 'ksh', 'ks', 'ku', 'kv', 'kw', 'ky', 'lad', 'la', 'lbe', 'lb', 'lez', 'lg', 'lij', 'li', 'lmo', 'ln', 'lo', 'ltg', 'lt', 'lv', 'mai', 'map-bms', 'mdf', 'mg', 'mhr', 'mh', 'min', 'mi', 'mk', 'ml', 'mn', 'mo', 'mrj', 'mr', 'ms', 'mt', 'mus', 'mwl', 'myv', 'my', 'mzn', 'nah', 'nap', 'na', 'nds-nl', 'nds', 'ne', 'new', 'ng', 'nl', 'nn', 'nov', 'no', 'nrm', 'nso', 'nv', 'ny', 'oc', 'om', 'or', 'os', 'pag', 'pam', 'pap', 'pa', 'pcd', 'pdc', 'pfl', 'pih', 'pi', 'pl', 'pms', 'pnb', 'pnt', 'ps', 'pt', 'qu', 'rm', 'rmy', 'rn', 'roa-rup', 'roa-tara', 'ro', 'rue', 'ru', 'rw', 'sah', 'sa', 'scn', 'sco', 'sc', 'sd', 'se', 'sg', 'sh', 'simple', 'si', 'sk', 'sl', 'sm', 'sn', 'so', 'sq', 'srn', 'sr', 'ss', 'stq', 'st', 'su', 'sv', 'sw', 'szl', 'ta', 'tet', 'te', 'tg', 'th', 'ti', 'tk', 'tl', 'tn', 'to', 'tpi', 'tr', 'ts', 'tt', 'tum', 'tw', 'tyv', 'ty', 'udm', 'ug', 'uk', 'ur', 'uz', 'vec', 'vep', 've', 'vi', 'vls', 'vo', 'war', 'wa', 'wo', 'wuu', 'xal', 'xh', 'xmf', 'yi', 'yo', 'za', 'zea', 'zh-classical', 'zh-min-nan', 'zh-yue', 'zh', 'zu' ],
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
				ca: [ 'es' ],
				en: [ 'es' ],
				es: [ 'ca' ]
			}
		}
	}
};
