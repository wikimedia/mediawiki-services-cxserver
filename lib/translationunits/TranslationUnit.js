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
		this.logger = context.logger;
	}

	log( level, info ) {
		if ( this.logger && this.logger.log ) {
			this.logger.log( level, info );
		}
	}

	adapt() {
		return this.node;
	}
}

TranslationUnit.matchTagNames = null;
TranslationUnit.matchRdfaTypes = null;

module.exports = TranslationUnit;
