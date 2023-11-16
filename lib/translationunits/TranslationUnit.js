'use strict';

/**
 * Base class for translation units.
 *
 * @class TranslationUnit
 * @abstract
 */
class TranslationUnit {
	constructor( node, sourceLanguage, targetLanguage, api, context ) {
		this.node = node;
		this.sourceLanguage = sourceLanguage;
		this.targetLanguage = targetLanguage;
		this.api = api;
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
TranslationUnit.allowedAttrs = null;

module.exports = TranslationUnit;
