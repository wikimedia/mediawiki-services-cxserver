'use strict';

module.exports = {
	// CX Server port
	port: 8080,
	// Log directory
	logDir: 'log',
	// Parsoid API URL
	'parsoid.api': 'http://parsoid-lb.eqiad.wikimedia.org',
	// Apertium web API URL
	'mt.apertium.api': 'http://apertium.wmflabs.org',
	// Use SSL?
	secure: false,
	// SSL key filename
	sslkey: null,
	// SSL cert filename
	cert: null,
	// Service registry
	registry: {
		af: {
			de: {
				dictionary: {
					providers: [
						'Dictd'
					]
				}
			},
			en: {
				dictionary: {
					providers: [
						'Dictd'
					]
				}
			},
			nl: {
				mt: {
					providers: [
						'Apertium'
					]
				}
			}
		},
		an: {
			es: {
				mt: {
					providers: [
						'Apertium'
					]
				}
			}
		},
		ar: {
			en: {
				dictionary: {
					providers: [
						'Dictd'
					]
				}
			},
			mt: {
				mt: {
					providers: [
						'Apertium'
					]
				}
			}
		},
		bg: {
			mk: {
				mt: {
					providers: [
						'Apertium'
					]
				}
			}
		},
		br: {
			en: {
				dictionary: {
					providers: [
						'Dictd'
					]
				}
			},
			fr: {
				dictionary: {
					providers: [
						'Dictd'
					]
				},
				mt: {
					providers: [
						'Apertium'
					]
				}
			}
		},
		ca: {
			es: {
				dictionary: {
					providers: [
						'JsonDict'
					]
				},
				mt: {
					providers: [
						'Apertium'
					]
				}
			},
			en: {
				mt: {
					providers: [
						'Apertium'
					]
				}
			},
			eo: {
				mt: {
					providers: [
						'Apertium'
					]
				}
			},
			fr: {
				mt: {
					providers: [
						'Apertium'
					]
				}
			},
			oc: {
				mt: {
					providers: [
						'Apertium'
					]
				}
			},
			pt: {
				mt: {
					providers: [
						'Apertium'
					]
				}
			}
		},
		cr: {
			en: {
				dictionary: {
					providers: [
						'Dictd'
					]
				}
			}
		},
		cs: {
			en: {
				dictionary: {
					providers: [
						'Dictd'
					]
				}
			}
		},
		cy: {
			en: {
				dictionary: {
					providers: [
						'Apertium'
					]
				},
				mt: {
					providers: [
						'Apertium'
					]
				}
			}
		},
		da: {
			en: {
				dictionary: {
					providers: [
						'Dictd'
					]
				}
			}
		},
		de: {
			en: {
				dictionary: {
					providers: [
						'Dictd'
					]
				}
			},
			fr: {
				dictionary: {
					providers: [
						'Dictd'
					]
				}
			},
			it: {
				dictionary: {
					providers: [
						'Dictd'
					]
				}
			},
			nl: {
				dictionary: {
					providers: [
						'Dictd'
					]
				}
			},
			ku: {
				dictionary: {
					providers: [
						'Dictd'
					]
				}
			},
			pt: {
				dictionary: {
					providers: [
						'Dictd'
					]
				}
			},
			tr: {
				dictionary: {
					providers: [
						'Dictd'
					]
				}
			}
		},
		en: {
			af: {
				dictionary: {
					providers: [
						'Dictd'
					]
				}
			},
			ar: {
				dictionary: {
					providers: [
						'Dictd'
					]
				}
			},
			bs: {
				mt: {
					providers: [
						'Apertium'
					]
				}
			},
			ca: {
				mt: {
					providers: [
						'Apertium'
					]
				}
			},
			cr: {
				dictionary: {
					providers: [
						'Dictd'
					]
				},
				mt: {
					providers: [
						'Apertium'
					]
				}
			},
			cs: {
				dictionary: {
					providers: [
						'Dictd'
					]
				}
			},
			cy: {
				dictionary: {
					providers: [
						'Dictd'
					]
				}
			},
			de: {
				dictionary: {
					providers: [
						'Dictd'
					]
				}
			},
			el: {
				dictionary: {
					providers: [
						'Dictd'
					]
				}
			},
			en: {
				dictionary: {
					providers: [
						'Dictd'
					]
				}
			},
			eo: {
				mt: {
					providers: [
						'Apertium'
					]
				}
			},
			es: {
				dictionary: {
					providers: [
						'JsonDict',
						'Dictd'
					]
				}
			},
			fr: {
				dictionary: {
					providers: [
						'Dictd'
					]
				}
			},
			ga: {
				dictionary: {
					providers: [
						'Dictd'
					]
				}
			},
			gl: {
				mt: {
					providers: [
						'Apertium'
					]
				}
			},
			hi: {
				dictionary: {
					providers: [
						'Dictd'
					]
				}
			},
			hr: {
				dictionary: {
					providers: [
						'Dictd'
					]
				},
				mt: {
					providers: [
						'Apertium'
					]
				}
			},
			hu: {
				dictionary: {
					providers: [
						'Dictd'
					]
				}
			},
			it: {
				dictionary: {
					providers: [
						'Dictd'
					]
				}
			},
			la: {
				dictionary: {
					providers: [
						'Dictd'
					]
				}
			},
			lt: {
				dictionary: {
					providers: [
						'Dictd'
					]
				}
			},
			nl: {
				dictionary: {
					providers: [
						'Dictd'
					]
				}
			},
			pl: {
				dictionary: {
					providers: [
						'Dictd'
					]
				}
			},
			pt: {
				dictionary: {
					providers: [
						'Dictd'
					]
				}
			},
			ro: {
				dictionary: {
					providers: [
						'Dictd'
					]
				}
			},
			ru: {
				dictionary: {
					providers: [
						'Dictd'
					]
				}
			},
			sr: {
				dictionary: {
					providers: [
						'Dictd'
					]
				},
				mt: {
					providers: [
						'Apertium'
					]
				}
			},
			sw: {
				dictionary: {
					providers: [
						'Dictd'
					]
				}
			},
			sv: {
				dictionary: {
					providers: [
						'Dictd'
					]
				}
			},
			tr: {
				dictionary: {
					providers: [
						'Dictd'
					]
				}
			}
		},
		eo: {
			en: {
				mt: {
					providers: [
						'Apertium'
					]
				}
			}
		},
		es: {
			ca: {
				dictionary: {
					providers: [
						'JsonDict'
					]
				},
				mt: {
					providers: [
						'Apertium'
					]
				}
			},
			pt: {
				mt: {
					providers: [
						'Apertium'
					]
				}
			},
			it: {
				mt: {
					providers: [
						'Apertium'
					]
				}
			},
			oc: {
				mt: {
					providers: [
						'Apertium'
					]
				}
			},
			en: {
				dictionary: {
					providers: [
						'Dictd'
					]
				},
				mt: {
					providers: [
						'Apertium'
					]
				}
			},
			fr: {
				mt: {
					providers: [
						'Apertium'
					]
				}
			},
			an: {
				mt: {
					providers: [
						'Apertium'
					]
				}
			},
			eo: {
				mt: {
					providers: [
						'Apertium'
					]
				}
			},
			gl: {
				mt: {
					providers: [
						'Apertium'
					]
				}
			}
		},
		eu: {
			en: {
				mt: {
					providers: [
						'Apertium'
					]
				}
			}
		},
		fr: {
			br: {
				dictionary: {
					providers: [
						'Dictd'
					]
				}
			},
			ca: {
				mt: {
					providers: [
						'Apertium'
					]
				}
			},
			de: {
				dictionary: {
					providers: [
						'Dictd'
					]
				}
			},
			en: {
				dictionary: {
					providers: [
						'Dictd'
					]
				}
			},
			eo: {
				mt: {
					providers: [
						'Apertium'
					]
				}
			},
			es: {
				mt: {
					providers: [
						'Apertium'
					]
				}
			},
			nl: {
				dictionary: {
					providers: [
						'Dictd'
					]
				}
			}
		},
		ga: {
			en: {
				dictionary: {
					providers: [
						'Dictd'
					]
				}
			},
			pl: {
				dictionary: {
					providers: [
						'Dictd'
					]
				}
			}
		},
		gd: {
			de: {
				dictionary: {
					providers: [
						'Dictd'
					]
				}
			}
		},
		gl: {
			en: {
				mt: {
					providers: [
						'Apertium'
					]
				}
			},
			es: {
				mt: {
					providers: [
						'Apertium'
					]
				}
			},
			pt: {
				mt: {
					providers: [
						'Apertium'
					]
				}
			}
		},
		hi: {
			en: {
				dictionary: {
					providers: [
						'Dictd'
					]
				}
			}
		},
		hr: {
			en: {
				dictionary: {
					providers: [
						'Dictd'
					]
				}
			}
		},
		hu: {
			en: {
				dictionary: {
					providers: [
						'Dictd'
					]
				}
			}
		},
		id: {
			ms: {
				mt: {
					providers: [
						'Apertium'
					]
				}
			}
		},
		is: {
			en: {
				dictionary: {
					providers: [
						'Dictd'
					]
				},
				mt: {
					providers: [
						'Apertium'
					]
				}
			}
		},
		it: {
			de: {
				dictionary: {
					providers: [
						'Dictd'
					]
				}
			},
			en: {
				dictionary: {
					providers: [
						'Dictd'
					]
				}
			}
		},
		ja: {
			de: {
				dictionary: {
					providers: [
						'Dictd'
					]
				}
			}
		},
		ku: {
			de: {
				dictionary: {
					providers: [
						'Dictd'
					]
				}
			},
			en: {
				dictionary: {
					providers: [
						'Dictd'
					]
				}
			},
			tr: {
				dictionary: {
					providers: [
						'Dictd'
					]
				}
			}
		},
		kk: {
			tt: {
				mt: {
					providers: [
						'Apertium'
					]
				}
			}
		},
		la: {
			de: {
				dictionary: {
					providers: [
						'Dictd'
					]
				}
			},
			en: {
				dictionary: {
					providers: [
						'Dictd'
					]
				}
			}
		},
		lt: {
			de: {
				dictionary: {
					providers: [
						'Dictd'
					]
				}
			}
		},
		mk: {
			bs: {
				mt: {
					providers: [
						'Apertium'
					]
				}
			},
			hr: {
				mt: {
					providers: [
						'Apertium'
					]
				}
			},
			sr: {
				mt: {
					providers: [
						'Apertium'
					]
				}
			},
			bg: {
				dictionary: {
					providers: [
						'Dictd'
					]
				},
				mt: {
					providers: [
						'Apertium'
					]
				}
			}
		},
		ms: {
			id: {
				mt: {
					providers: [
						'Apertium'
					]
				}
			}
		},
		mt: {
			ar: {
				mt: {
					providers: [
						'Apertium'
					]
				}
			}
		},
		nb: {
			da: {
				mt: {
					providers: [
						'Apertium'
					]
				}
			},
			nn: {
				mt: {
					providers: [
						'Apertium'
					]
				}
			}
		},
		nl: {
			de: {
				dictionary: {
					providers: [
						'Dictd'
					]
				}
			},
			en: {
				dictionary: {
					providers: [
						'Dictd'
					]
				}
			},
			fr: {
				dictionary: {
					providers: [
						'Dictd'
					]
				}
			},
			af: {
				mt: {
					providers: [
						'Apertium'
					]
				}
			}
		},
		nn: {
			da: {
				mt: {
					providers: [
						'Apertium'
					]
				}
			},
			nb: {
				mt: {
					providers: [
						'Apertium'
					]
				}
			}
		},
		oc: {
			ca: {
				mt: {
					providers: [
						'Apertium'
					]
				}
			},
			es: {
				mt: {
					providers: [
						'Apertium'
					]
				}
			}
		},
		pl: {
			ga: {
				dictionary: {
					providers: [
						'Dictd'
					]
				}
			}
		},
		pt: {
			ca: {
				mt: {
					providers: [
						'Apertium'
					]
				}
			},
			de: {
				dictionary: {
					providers: [
						'Dictd'
					]
				}
			},
			en: {
				dictionary: {
					providers: [
						'Dictd'
					]
				}
			},
			es: {
				mt: {
					providers: [
						'Apertium'
					]
				}
			},
			gl: {
				mt: {
					providers: [
						'Apertium'
					]
				}
			}
		},
		ro: {
			es: {
				mt: {
					providers: [
						'Apertium'
					]
				}
			}
		},
		sa: {
			de: {
				dictionary: {
					providers: [
						'Dictd'
					]
				}
			}
		},
		sh: {
			sl: {
				mt: {
					providers: [
						'Apertium'
					]
				}
			}
		},
		sk: {
			en: {
				dictionary: {
					providers: [
						'Dictd'
					]
				}
			}
		},
		sl: {
			bs: {
				mt: {
					providers: [
						'Apertium'
					]
				}
			},
			cr: {
				mt: {
					providers: [
						'Apertium'
					]
				}
			},
			hr: {
				mt: {
					providers: [
						'Apertium'
					]
				}
			},
			sr: {
				mt: {
					providers: [
						'Apertium'
					]
				}
			}
		},
		sr: {
			en: {
				dictionary: {
					providers: [
						'Dictd'
					]
				}
			}
		},
		sw: {
			en: {
				dictionary: {
					providers: [
						'Dictd'
					]
				}
			},
			pl: {
				dictionary: {
					providers: [
						'Dictd'
					]
				}
			}
		},
		sv: {
			en: {
				dictionary: {
					providers: [
						'Dictd'
					]
				}
			},
			da: {
				mt: {
					providers: [
						'Apertium'
					]
				}
			},
			is: {
				mt: {
					providers: [
						'Apertium'
					]
				}
			}
		},
		tr: {
			de: {
				dictionary: {
					providers: [
						'Dictd'
					]
				}
			},
			en: {
				dictionary: {
					providers: [
						'Dictd'
					]
				}
			}
		},
		tt: {
			kk: {
				mt: {
					providers: [
						'Apertium'
					]
				}
			}
		}
	}
};
