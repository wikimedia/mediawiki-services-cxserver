'use strict';

var LinearDoc = require( './lineardoc' );

function Adapter( sourceLanguage, targetLanguage, context ) {
	this.parser = new LinearDoc.Parser();
	this.parser.init();
	this.sourceLanguage = sourceLanguage;
	this.targetLanguage = targetLanguage;
	this.originalDoc = null;
	this.adaptedDoc = null;
	this.context = context;
	this.logger = context.logger;
}

Adapter.prototype.adapt = function ( content ) {
	this.parser.write( content );
	this.originalDoc = this.parser.builder.doc;
	return this.originalDoc.adapt( this.getAdapter.bind( this ) );
};

/**
 * Get the adapter for the given tag(translation unit).
 * @param {Object} element
 * @return {TranslationUnit}
 */
Adapter.prototype.getAdapter = function ( element ) {
	var name, match = false, translationUnit, translationUnits;

	translationUnits = require( __dirname + '/translationunits/' );
	for ( name in translationUnits ) {
		translationUnit = translationUnits[ name ];
		if ( translationUnit.matchTagNames ) {
			match = translationUnit.matchTagNames.includes( element.name );
		}
		if ( translationUnit.matchRdfaTypes ) {
			match = translationUnit.matchRdfaTypes.includes( element.attributes.rel ) || translationUnit.matchRdfaTypes.includes( element.attributes.typeof );
		}
		if ( match ) {
			break;
		}
	}

	if ( !match ) {
		// this.logger.log( 'debug', 'No adapter for ' + element.name );
		return null;
	}

	return new translationUnits[ name ]( element, this.sourceLanguage, this.targetLanguage, this.context );
};

module.exports = Adapter;
