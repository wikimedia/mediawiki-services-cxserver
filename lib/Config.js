'use strict';

const fs = require( 'fs' ),
	yaml = require( 'js-yaml' );

class CXConfig {
	constructor( app ) {
		this.app = app;
		this.logger = app.logger;
		this.languages = null;
		this.mt = {};
		this.parseAndLoadConfig();
	}

	log( level, info ) {
		if ( this.logger && this.logger.log ) {
			this.logger.log( level, info );
		}
	}

	isObject( x ) {
		return ( !!x ) && ( x.constructor === Object );
	}

	isString( x ) {
		return typeof x === 'string' || x instanceof String;
	}

	parseAndLoadConfig() {
		// Supported languages
		this.loadLanguageConf();
		this.log( 'debug', `Found ${ this.languages?.length } languages from the configuration` );
		// Machine translation providers
		this.mt = this.loadServiceConf( this.app.conf.mt, 'mt' );
		this.log( 'debug', `Found ${ Object.keys( this.mt ).length } MT providers` );
	}

	loadLanguageConf() {
		if ( Array.isArray( this.app.conf.languages ) ) {
			// Configuration is provided as an array
			this.languages = this.app.conf.languages;
		} else if ( this.isString( this.app.conf.languages ) ) {
			// Configuration is provided in the named file
			try {
				this.languages = yaml.load( fs.readFileSync( this.app.conf.languages ) );
			} catch ( e ) {
				this.log( 'warn/spec', 'Could not load the languages registry: ' + e );
			}
		} else {
			this.log( 'error', 'Could not parse cxserver.conf.languages' );
		}
	}

	loadServiceConf( input, type ) {
		const output = {};
		const providers = Object.keys( input ).filter( ( item ) => item !== 'defaults' );

		for ( const providerName of providers ) {
			const languageRef = input[ providerName ].languages;

			if ( this.isObject( languageRef ) ) {
				// Language configuration is provided as an object
				output[ providerName ] = languageRef;
			} else if ( this.isString( languageRef ) ) {
				// Language configuration is provided in the named file
				try {
					const providerLanguages = yaml.load( fs.readFileSync( languageRef ) );

					// Allow hooking in JavaScript code to define the language pairs
					if ( providerLanguages.handler ) {
						const Handler = require( __dirname + '/../config/' + providerLanguages.handler );
						output[ providerName ] = new Handler( providerLanguages ).languages;
					} else {
						output[ providerName ] = providerLanguages;
					}
				} catch ( e ) {
					this.log( 'error', `Could not load or parse file '${ languageRef }': ${ e }` );
				}
			} else {
				this.log( 'error', `Could not parse cxserver.conf.${ type }.${ providerName }` );
			}
		}

		// Handle "default provider" configuration separately
		if ( !input.defaults ) {
			return output;
		}

		if ( Array.isArray( input.defaults ) ) {
			// "Default provider" configuration is provided as an array
			output.defaults = input.defaults;
		} else if ( this.isString( input.defaults ) ) {
			// "Default provider" configuration is provided in the named file
			try {
				output.defaults = yaml.load( fs.readFileSync( input.defaults ) );
			} catch ( e ) {
				this.log( 'error', `Could not load or parse file '${ input.defaults }': ${ e }` );
			}
		} else {
			this.log( 'error', `Could not parse cxserver.conf.${ type }.defaults` );
		}

		return output;
	}

	/**
	 * Return all language pairs.
	 *
	 * @return {Object} The languages, indexed by source language
	 *   pointing to a list of target languages.
	 */
	get LanguagePairs() {
		return {
			source: this.languages,
			target: this.languages
		};
	}

	get MTPairs() {
		return this.mt;
	}

	/**
	 * Get the available toolset for the given language
	 *
	 * @param {string} language
	 * @return {Object} The toolset for the given language
	 */
	getToolSetForLanguage( language ) {
		const tools = { mt: this.mt },
			result = { mt: {} };

		Object.keys( tools ).forEach( ( toolName ) => {
			const tool = tools[ toolName ], providers = Object.keys( tool );

			// Go through default MTs for language pairs and filter out the pairs where
			// source language is equal to the language provided as param of this method.
			// Then, add target language and default MT to the result object.
			Object.keys( tool.defaults || {} )
				.filter( ( pair ) => pair.indexOf( language + '-' ) === 0 )
				.forEach( ( pair ) => {
					const targetLanguage = pair.slice( language.length + 1 );

					result[ toolName ][ targetLanguage ] =
						result[ toolName ][ targetLanguage ] || [];
					result[ toolName ][ targetLanguage ].push( tool.defaults[ pair ] );
				} );

			for ( let i = 0, length = providers.length; i < length; i++ ) {
				const provider = providers[ i ], languages = tool[ provider ][ language ];

				if ( !languages ) {
					continue;
				}

				// Add each target language to the result object as key
				// and push MT provider to the values array.
				for ( let j = 0, langsLength = languages.length; j < langsLength; j++ ) {
					const targetLanguage = languages[ j ],
						results = result[ toolName ][ targetLanguage ];

					if ( !results ) {
						result[ toolName ][ targetLanguage ] = [ provider ];
					} else if ( !results.includes( provider ) ) { // Don't duplicate providers
						result[ toolName ][ targetLanguage ].push( provider );
					}
				}
			}
		} );

		return result;
	}

	/**
	 * Get the available toolset for the given language pair
	 *
	 * @param {string} from source language
	 * @param {string} to target language
	 * @return {Object} the toolset (empty object if nothing available)
	 */
	getToolSet( from, to ) {
		const result = {};

		if ( !to ) {
			return this.getToolSetForLanguage( from );
		}

		// Known tools
		const tools = { mt: this.mt };

		Object.keys( tools ).forEach( ( toolname ) => {
			let defaultProvider;
			const tool = tools[ toolname ];
			const providers = Object.keys( tool );
			// If there is a default provider, add it to the beginning of array.
			if ( tool.defaults && tool.defaults[ from + '-' + to ] ) {
				defaultProvider = tool.defaults[ from + '-' + to ];
				result[ toolname ] = [ defaultProvider ];
			}
			for ( let j = 0; j < providers.length; j++ ) {
				const provider = tool[ providers[ j ] ];
				if ( provider[ from ] && provider[ from ].includes( to ) &&
					defaultProvider !== providers[ j ]
				) {
					result[ toolname ] = result[ toolname ] || [];
					result[ toolname ].push( providers[ j ] );
				}
			}
		} );

		return result;
	}

	/**
	 * Get the valid toolsets for the given language pair.
	 * If the provider name is given, it is validated.
	 * If provider name is not given, the first one that appears in the registry will be returned.
	 * If not valid provider is found, the returns null.
	 *
	 * @param {string} from source language
	 * @param {string} to target language
	 * @param {string} serviceType Service type from the registry, such as 'mt' or 'dictionary'
	 * @param {string} [providerName] If given, the provider is validated.
	 * @return {string|null|boolean} Provider name
	 */
	getValidProvider( from, to, serviceType, providerName ) {
		const toolset = this.getToolSet( from, to );

		if ( !toolset[ serviceType ] ) {
			// No tools found for this service for this language pair
			return null;
		}

		if ( providerName ) {
			if ( !toolset[ serviceType ].includes( providerName ) ) {
				// The requested provider doesn't appear in the registry,
				// so it's invalid
				return false;
			}

			// The provider is valid
			return providerName;
		}

		// If provider not given, use the first one in the registry
		return toolset[ serviceType ][ 0 ];
	}
}

module.exports = CXConfig;
