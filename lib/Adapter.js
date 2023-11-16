'use strict';

/**
 * @external TranslationUnit
 */

const LinearDoc = require( './lineardoc' );

class Adapter {
	constructor( sourceLanguage, targetLanguage, api, context ) {
		this.parser = new LinearDoc.Parser( new LinearDoc.MwContextualizer() );
		this.parser.init();
		this.sourceLanguage = sourceLanguage;
		this.targetLanguage = targetLanguage;
		this.originalDoc = null;
		this.adaptedDoc = null;
		this.api = api;
		this.context = context;
		this.logger = context.logger;
	}

	adapt( content ) {
		this.parser.write( content );
		this.originalDoc = this.parser.builder.doc;
		return this.originalDoc.adapt( this.getAdapter.bind( this ) );
	}

	/**
	 * Get the adapter for the given tag(translation unit).
	 *
	 * @param {Object} element
	 * @return {TranslationUnit|null}
	 */
	getAdapter( element ) {
		let name, match = false;
		const translationUnits = require( __dirname + '/translationunits/' );

		const matchRdfaTypes = ( source, target ) => source.some( ( r ) => target.includes( r ) );

		for ( name in translationUnits ) {
			const translationUnit = translationUnits[ name ];
			if ( translationUnit.matchTagNames ) {
				match = translationUnit.matchTagNames.includes( element.name );

				if ( !match ) {
					// If matchTagNames is explicitly defined, a match is must.
					continue;
				}
			}
			if ( translationUnit.matchRdfaTypes ) {
				const rel = element.attributes && element.attributes.rel;
				const typeOfAttr = element.attributes && element.attributes.typeof;
				// typeOfAttr can be space separated multiple attributes
				// Example: mw:Extension/templatestyles mw:Transclusion
				// rel can also be space separated multiple attributes
				// Example: mw:ExtLink nofollow
				// So split them to an array and match the translationUnit.matchRdfaTypes
				// and the typeof and rel attribute values of the element.
				match = matchRdfaTypes(
					translationUnit.matchRdfaTypes,
					[ ...( rel ? rel.split( /\s/ ) : [] ), ...( typeOfAttr ? typeOfAttr.split( /\s/ ) : [] ) ]
				);
				if ( !match ) {
					// If matchRdfaTypes is explicitly defined, a match is must.
					continue;
				}
			}
			if ( translationUnit.matchClasses ) {
				const classes = element.attributes && element.attributes.class;

				match = matchRdfaTypes(
					translationUnit.matchClasses,
					classes ? classes.split( /\s/ ) : []
				);
				if ( !match ) {
					// If matchClasses is explicitly defined, a match is must.
					continue;
				}
			}
			if ( translationUnit.allowedAttrs ) {
				const attrNames = Object.keys( element.attributes );
				match = attrNames.every(
					( attr ) => translationUnit.allowedAttrs.includes( attr )
				);
				if ( !match ) {
					// If allowedAttrs is explicitly defined, a match is must.
					continue;
				}
			}
			if ( match ) {
				break;
			}
		}

		if ( !match ) {
			// this.logger.log( 'debug', 'No adapter for ' + element.name );
			return null;
		}

		return new translationUnits[ name ](
			element, this.sourceLanguage, this.targetLanguage, this.api, this.context
		);
	}
}

module.exports = Adapter;
