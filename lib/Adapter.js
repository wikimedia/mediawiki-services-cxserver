'use strict';

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
	 * @param {Object} element
	 * @return {TranslationUnit|null}
	 */
	getAdapter( element ) {
		let name, match = false,
			translationUnits = require( __dirname + '/translationunits/' );

		for ( name in translationUnits ) {
			let translationUnit = translationUnits[ name ];
			if ( translationUnit.matchTagNames ) {
				match = translationUnit.matchTagNames.includes( element.name );

				if ( !match ) {
					// If matchTagNames is explicitly defined, a match is must.
					continue;
				}
			}
			if ( translationUnit.matchRdfaTypes ) {
				match = translationUnit.matchRdfaTypes.includes( element.attributes.rel ) || translationUnit.matchRdfaTypes.includes( element.attributes.typeof );
				if ( !match ) {
					// If matchRdfaTypes is explicitly defined, a match is must.
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

		return new translationUnits[ name ]( element, this.sourceLanguage, this.targetLanguage, this.api, this.context );
	}
}

module.exports = Adapter;
