'use strict';

const TranslationUnit = require( './TranslationUnit' ),
	MWApiRequest = require( '../mw/MwApiRequest' );

class MWGallery extends TranslationUnit {

	async adapt() {
		this.galleryData = JSON.parse( this.node.attributes[ 'data-mw' ] );
		if ( !this.galleryData ) {
			this.log( 'error', 'Skipping invalid data-mw for gallery node: ' + this.node.attributes.id );
			return this.node;
		}
		// mw-data.body.extsrc has each image of the gallery separated by line breaks.
		// The line breaks can be \r, \n or \r\n
		const imageItems = this.galleryData.body.extsrc.split( /[\r\n]+/ );

		for ( let i = 0; i < imageItems.length; i++ ) {
			if ( !imageItems[ i ].trim() ) {
				continue;
			}
			// Each item has image title and caption separated by '|'. But the caption itself
			// can have | for MW links, split by first occurrence alone.
			let [ imageTitle, imageCaptionWikitext ] = imageItems[ i ].trim().split( /\|(.+)/ );
			// Adapt namespace alias of title
			const namespaceAlias = await this.api.getNamespaceAlias( 'File', this.targetLanguage );
			imageTitle = imageTitle.replace( /^(\.\.?\/)*(.+)(:)/, '$1' + namespaceAlias + '$3' );

			// Translate image caption if there is MT client for the adaptation context
			if ( this.context.conf.mtClient ) {
				// Convert the current image caption to html
				const imageCaptionHTML = await new MWApiRequest( {
					context: this.context,
					sourceLanguage: this.sourceLanguage,
					targetLanguage: this.targetLanguage
				} ).wikitextToHTML( imageCaptionWikitext, this.sourceLanguage );

				// Machine translate the HTML caption
				const imageCaptionHTMLTranslated = await this.context.conf.mtClient.translate(
					this.sourceLanguage, this.targetLanguage, imageCaptionHTML
				);

				// Convert the machine translated html caption to wikitext.
				imageCaptionWikitext = await new MWApiRequest( {
					context: this.context,
					sourceLanguage: this.sourceLanguage,
					targetLanguage: this.targetLanguage
				} ).htmlToWikiText( imageCaptionHTMLTranslated, this.targetLanguage );
			}

			imageItems[ i ] = [ imageTitle, imageCaptionWikitext ].join( '|' ).replace( '\n', '' );
		}

		this.galleryData.body.extsrc = imageItems.join( '\n' );
		this.node.attributes[ 'data-mw' ] = JSON.stringify( this.galleryData );

		return this.node;
	}
}
MWGallery.matchRdfaTypes = [ 'mw:Extension/gallery' ];

module.exports = MWGallery;
