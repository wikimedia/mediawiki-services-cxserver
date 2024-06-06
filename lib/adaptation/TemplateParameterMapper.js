'use strict';

const cxutil = require( '../util' );

class TemplateParameterMapper {
	constructor( sourceParams, sourceTemplateData, targetTemplateData, mappingFromDatabase = {} ) {
		this.sourceParams = sourceParams;
		this.sourceTemplateData = sourceTemplateData;
		this.targetTemplateData = targetTemplateData;
		this.parameterMap = {};
		this.parametersAreMapped = false;
		this.mappingFromDatabase = mappingFromDatabase;
	}

	getAdaptedParameters() {
		const adaptedParameters = {};
		const parameterMap = this.getParameterMap();
		for ( const name in this.sourceParams ) {
			if ( name in parameterMap ) {
				adaptedParameters[ parameterMap[ name ] ] = this.sourceParams[ name ];
			}
		}

		return adaptedParameters;
	}

	getMandatoryParamsForTarget() {
		if ( !this.targetTemplateData.params ) {
			return [];
		}
		return Object.keys( this.targetTemplateData.params ).filter(
			( paramName ) => this.targetTemplateData.params[ paramName ].required === true
		);
	}

	getOptionalParamsForTarget() {
		if ( !this.targetTemplateData.params ) {
			return [];
		}
		return Object.keys( this.targetTemplateData.params ).filter(
			( paramName ) => this.targetTemplateData.params[ paramName ].required === false
		);
	}

	/**
	 * Find target template parameter mapping for all the parameters in source template.
	 *
	 * @return {Object} Object with mapping from each source param to param name in target template.
	 */
	getParameterMap() {
		if ( this.parametersAreMapped ) {
			return this.parameterMap;
		}

		const sourceCitoidMap = cxutil.getProp( [ 'maps', 'citoid' ], this.sourceTemplateData ) || {};
		const targetCitoidMap = cxutil.getProp( [ 'maps', 'citoid' ], this.targetTemplateData ) || {};

		for ( const name in this.sourceParams ) {
			if ( !isNaN( name ) ) {
				// Unnamed parameters, which are named 1, 2, 3...
				this.parameterMap[ name ] = name;
				continue;
			}

			if ( !this.targetTemplateData.params ) {
				// No params in target template data definition
				continue;
			}

			// Try to locate this source param in the source template data definition
			const normalizedKey = name.trim().toLowerCase().replace( /[\s+_-]+/g, '' );
			const sourceTemplateParam = this.sourceTemplateData.params[ name ] ||
				this.sourceTemplateData.params[ normalizedKey ];
			let sourceAliases = sourceTemplateParam ? sourceTemplateParam.aliases : [];

			if ( !sourceTemplateParam ) {
				// The source param name can be in the aliases of other params in source
				//  template data. If so find that param and add aliases to sourceAliases
				const paramMatchingAlias = Object.keys( this.sourceTemplateData.params ).find(
					( key ) => ( this.sourceTemplateData.params[ key ].aliases || [] )
						.includes( name )
				);
				if ( paramMatchingAlias ) {
					sourceAliases.push( paramMatchingAlias );
					sourceAliases = sourceAliases.concat(
						this.sourceTemplateData.params[ paramMatchingAlias ].aliases || []
					);
				}
			}
			const sourceKeyAndAliases = new Set( sourceAliases );
			sourceKeyAndAliases.add( name );
			sourceKeyAndAliases.add( normalizedKey );

			// Search in the aliases for a match - case insensitive.
			for ( const paramName in this.targetTemplateData.params ) {
				const param = this.targetTemplateData.params[ paramName ];

				const targetKeyAndAliases = new Set(
					[
						...( param.aliases || [] ),
						paramName,
						// The citoid map inside the template data has parameter name mapping.
						// consider each of those mapping as an alias to target params.
						...this.getNameAliasesFromCitoid( paramName, sourceCitoidMap ),
						...this.getNameAliasesFromCitoid( paramName, targetCitoidMap )
					]
				);

				// Find intersection of sourceKeyAndAliases and targetKeyAndAliases
				const match = ( [ ...targetKeyAndAliases ].some( ( key ) =>
					// key can be integer or string.
					 sourceKeyAndAliases.has(
						`${ key }`.trim().toLowerCase().replace( /[\s+_-]+/g, '' )
					)
				 ) );

				if ( match ) {
					// Found a match
					this.parameterMap[ name ] = paramName;
					break;
				}
			}
			// Still not found? Try templatemapping database
			if ( !this.parameterMap[ name ] && this.mappingFromDatabase[ name ] ) {
				this.parameterMap[ name ] = this.mappingFromDatabase[ name ];
			}
		}

		this.parametersAreMapped = true;
		return this.parameterMap;
	}

	/**
	 * For the given parameter name, get the aliases from the citoid map
	 *
	 * @param {string} paramName
	 * @param {Object} citoidMap
	 * @return {Set}
	 */
	getNameAliasesFromCitoid( paramName, citoidMap ) {
		const aliases = new Set();
		const citoidAliases = citoidMap[ paramName ];
		if ( !citoidAliases ) {
			return aliases;
		}
		if ( !Array.isArray( citoidAliases ) ) {
			aliases.add( citoidAliases );
		} else {
			// Sometimes citoid map values are nested arrays like
			// "author": [ [ "first", "last" ], [ "first2", "last2" ] ]
			// That is not a useful information to do parameter mapping.
			citoidAliases
				.filter( ( alias ) => !Array.isArray( alias ) )
				.forEach( ( alias ) => aliases.add( alias ) );
		}
		return aliases;
	}
}

module.exports = TemplateParameterMapper;
