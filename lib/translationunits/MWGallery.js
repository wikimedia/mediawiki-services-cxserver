'use strict';

const cxutil = require( '../util.js' ),
	TranslationUnit = require( './TranslationUnit.js' ),
	MWApiRequest = require( '../mw/ApiRequest.js' );

class MWGallery extends TranslationUnit {}

MWGallery.prototype.adapt = cxutil.async( function*() {
	var imageItems, imageTitle, namespaceAlias, imageCaptionWikitext,
		imageCaptionHTML, imageCaptionHTMLTranslated;

	this.galleryData = JSON.parse( this.node.attributes[ 'data-mw' ] );
	if ( !this.galleryData ) {
		this.log( 'error', 'Skipping invalid data-mw for gallery node: ' + this.node.attributes.id );
		return this.node;
	}
	// mw-data.body.extsrc has each image of the gallery separated by line breaks.
	// The line breaks can be \r, \n or \r\n
	imageItems = this.galleryData.body.extsrc.split( /[\r\n]+/ );

	for ( let i = 0; i < imageItems.length; i++ ) {
		if ( !imageItems[ i ].trim() ) {
			continue;
		}
		// Each item has image title and caption separated by '|'. But the caption itself
		// can have | for MW links, split by first occurrence alone.
		[ imageTitle, imageCaptionWikitext ] = imageItems[ i ].trim().split( /\|(.+)/ );
		// Adapt namespace alias of title
		namespaceAlias = yield this.api.getNamespaceAlias( 'File', this.targetLanguage );
		imageTitle = imageTitle.replace( /^(\.\.?\/)*(.+)(:)/, '$1' + namespaceAlias + '$3' );

		// Translate image caption if there is MT client for the adaptation context
		if ( this.context.conf.mtClient ) {
			// Convert the current image caption to html
			imageCaptionHTML = yield new MWApiRequest( {
				context: this.context,
				sourceLanguage: this.sourceLanguage,
				targetLanguage: this.targetLanguage
			} ).wikitextToHTML( imageCaptionWikitext, this.sourceLanguage );

			// Machine translate the HTML caption
			imageCaptionHTMLTranslated = yield this.context.conf.mtClient.translate(
				this.sourceLanguage, this.targetLanguage, imageCaptionHTML
			);

			// Convert the machine translated html caption to wikitext.
			imageCaptionWikitext = yield new MWApiRequest( {
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
} );

MWGallery.matchRdfaTypes = [ 'mw:Extension/gallery' ];

module.exports = MWGallery;
