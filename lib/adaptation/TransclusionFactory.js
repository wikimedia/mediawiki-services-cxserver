'use strict';

const TemplateTransclusion = require( './TemplateTransclusion' );
const UnsupportedTransclusion = require( './UnsupportedTransclusion' );

class TransclusionFactory {
	constructor( api, sourceLanguage, targetLanguage ) {
		this.api = api;
		this.sourceLanguage = sourceLanguage;
		this.targetLanguage = targetLanguage;
	}

	create( part ) {
		if ( typeof part === 'object' && part.template ) {
			return new TemplateTransclusion( part, this.api, this.sourceLanguage, this.targetLanguage );
		} else {
			// Strings are verbatim wikitext
			return new UnsupportedTransclusion( part );
		}
	}
}

module.exports = TransclusionFactory;
