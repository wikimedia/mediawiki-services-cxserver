'use strict';

module.exports = {
	// CX Server port
	port: 8080,
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
		af: {
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
			fr: {
				mt: {
					providers: [
						'Apertium'
					]
				}
			}
		},
		ca: {
			es: {
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
		cy: {
			en: {
				mt: {
					providers: [
						'Apertium'
					]
				}
			}
		},
		en: {
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
			gl: {
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
			ca: {
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
			es: {
				mt: {
					providers: [
						'Apertium'
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
			ur: {
				mt: {
					providers: [
						'Apertium'
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
				mt: {
					providers: [
						'Apertium'
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
		pt: {
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
		sh: {
			sl: {
				mt: {
					providers: [
						'Apertium'
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
		sv: {
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
		tt: {
			kk: {
				mt: {
					providers: [
						'Apertium'
					]
				}
			}
		},
		ur: {
			hi: {
				mt: {
					providers: [
						'Apertium'
					]
				}
			}
		}
	}
};
