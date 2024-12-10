import TemplateTransclusion from './TemplateTransclusion.js';
import UnsupportedTransclusion from './UnsupportedTransclusion.js';

class TransclusionFactory {
	constructor( api, sourceLanguage, targetLanguage, options ) {
		this.api = api;
		this.sourceLanguage = sourceLanguage;
		this.targetLanguage = targetLanguage;
		this.options = options;
	}

	create( part ) {
		if ( typeof part === 'object' && part.template ) {
			return new TemplateTransclusion(
				part, this.api, this.sourceLanguage, this.targetLanguage, this.options
			);
		} else {
			// Strings are verbatim wikitext
			return new UnsupportedTransclusion( part );
		}
	}
}

export default TransclusionFactory;
