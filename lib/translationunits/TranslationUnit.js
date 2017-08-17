'use strict';

/*
 * @abstract
 */
class TranslationUnit {
	constructor( node, sourceLanguage, targetLanguage, context ) {
		this.node = node;
		this.sourceLanguage = sourceLanguage;
		this.targetLanguage = targetLanguage;
		this.context = context;
	}

	adapt() {
		return this.node;
	}
}

TranslationUnit.matchTagNames = null;
TranslationUnit.matchRdfaTypes = null;

module.exports = TranslationUnit;
