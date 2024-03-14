'use strict';

const TranslationUnit = require( './TranslationUnit' );

class MWGallery extends TranslationUnit {
	async adapt() {
		// As per https://m.mediawiki.org/wiki/Specs/HTML/2.7.0/Extensions/Gallery
		if ( this.node.children && this.context.conf.mtClient ) {
			const textChunks = this.node.children.textChunks;
			for ( let i = 0, len = textChunks.length; i < len; i++ ) {
				const chunk = this.node.children.textChunks[ i ];
				const caption = chunk.text;
				const translatedCaption = await this.context.conf.mtClient.translate(
					this.sourceLanguage, this.targetLanguage, caption
				);
				chunk.text = translatedCaption;
			}
		}

		return this.node;
	}
}

MWGallery.matchTagNames = [ 'li', 'div' ];
MWGallery.matchClasses = [ 'gallerycaption', 'gallerytext' ];

module.exports = MWGallery;
