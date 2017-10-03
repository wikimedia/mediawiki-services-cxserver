'use strict';

class TemplateParameterMapper {
	constructor( sourceParams, sourceTemplateData, targetTemplateData ) {
		this.sourceParams = sourceParams;
		this.sourceTemplateData = sourceTemplateData;
		this.targetTemplateData = targetTemplateData;
		this.parameterMap = {};
		this.paramatersAreMapped = false;
	}

	getAdaptedParameters() {
		const adaptedParameters = {};
		const parameterMap = this.getParameterMap();
		for ( let name in this.sourceParams ) {
			if ( name in parameterMap ) {
				adaptedParameters[ parameterMap[ name ] ] = this.sourceParams[ name ];
			}
		}

		return adaptedParameters;
	}

	/**
	 * Find target template parameter mapping for all the parameters in source template.
	 * @return {Object} Object with mapping from each source param to param name in target template.
	 */
	getParameterMap() {
		if ( this.paramatersAreMapped ) {
			return this.parameterMap;
		}

		for ( let name in this.sourceParams ) {
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
			let normalizedKey = name.trim().toLowerCase().replace( /[\s+_-]+/g, '' );
			let sourceTemplateParam = this.sourceTemplateData.params[ name ] || this.sourceTemplateData.params[ normalizedKey ];
			let sourceAliases = sourceTemplateParam ? sourceTemplateParam.aliases : [];
			let sourceKeyAndAliases = new Set( sourceAliases );
			sourceKeyAndAliases.add( name );
			sourceKeyAndAliases.add( normalizedKey );

			// Search in the aliases for a match - case insensitive.
			for ( let paramName in this.targetTemplateData.params ) {
				const param = this.targetTemplateData.params[ paramName ];

				let targetKeyAndAliases = new Set( param.aliases );
				targetKeyAndAliases.add( paramName );

				// Find intersection of sourceKeyAndAliases and targetKeyAndAliases
				let intersection = new Set( [ ...targetKeyAndAliases ].filter( key => {
					let normalizedKey = key.trim().toLowerCase().replace( /[\s+_-]+/g, '' );
					return sourceKeyAndAliases.has( normalizedKey );
				} ) );

				if ( intersection.size > 0 ) {
					// Found a match
					this.parameterMap[ name ] = paramName;
					break;
				}
			}
		}

		this.paramatersAreMapped = true;
		return this.parameterMap;
	}
}

module.exports = TemplateParameterMapper;
