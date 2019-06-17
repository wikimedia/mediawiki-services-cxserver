'use strict';

const TranslationUnit = require( './TranslationUnit.js' ),
	languageData = require( 'language-data' ),
	CommonsFilePathPrefix = '//upload.wikimedia.org/wikipedia/commons/';

class MWImage extends TranslationUnit {
	constructor( node, sourceLanguage, targetLanguage, api, context ) {
		super( node, sourceLanguage, targetLanguage, api, context );
		this.imageSource = null;
		this.sourceResource = null;
		this.isInlineImage = node.name === 'figure-inline';
	}

	/**
	 * Check if an image is coming from Commons or not. Uses the URL pattern of the common file
	 * repository to determine whether the image is stored there.
	 * @param {string} imageSrc
	 * @return {boolean}
	 */
	isCommonsImage( imageSrc ) {
		return imageSrc.indexOf( CommonsFilePathPrefix ) === 0;
	}

	/**
	 * Adapt the image's alignment settings for the target language.
	 */
	adaptImageAlignment() {
		var classes, targetDirection, sourceDirection, leftIndex, rightIndex;

		sourceDirection = languageData.getDir( this.sourceLanguage );
		targetDirection = languageData.getDir( this.targetLanguage );

		if ( sourceDirection === targetDirection ) {
			// Source and target languages has same directionality. Nothing to do
			return;
		}

		classes = this.node.attributes.class.split( ' ' );
		// If the image has an explicit alignment class in HTML, this means that it has explicit
		// alignment defined in wiki syntax. It must be explicitly flipped if the target language's
		// direction is different.
		leftIndex = classes.indexOf( 'mw-halign-left' );
		rightIndex = classes.indexOf( 'mw-halign-right' );
		if ( leftIndex > -1 ) {
			classes[ leftIndex ] = 'mw-halign-right';
		} else if ( rightIndex > -1 ) {
			classes[ rightIndex ] = 'mw-halign-left';
		}

		this.node.attributes.class = classes.join( ' ' );
	}
	async adapt() {
		let sourceImage, imageLink, textChunks, dataCX = { adapted: false };

		textChunks = this.isInlineImage ? [] : this.node.children.textChunks;
		for ( let i = 0, len = textChunks.length; i < len; i++ ) {
			let chunk = this.node.children.textChunks[ i ];
			if ( chunk.tags[ 0 ] && chunk.tags[ 0 ].name === 'a' ) {
				imageLink = chunk.tags[ 0 ];
			}
			if ( chunk.inlineContent && chunk.inlineContent.name === 'img' ) {
				sourceImage = chunk.inlineContent;
				break;
			}
		}

		if ( this.isInlineImage ) {
		// The image caption is in data-mw attribute.
		// If there is no caption, data-mw will not be present.
			if ( this.node.attributes[ 'data-mw' ] && this.context.conf.mtClient ) {
			// This is an inline image, Adapting the caption alone.
				const caption = JSON.parse( this.node.attributes[ 'data-mw' ] ).caption;
				const translatedCaption = await this.context.conf.mtClient.translate(
					this.sourceLanguage, this.targetLanguage, caption
				);
				this.node.attributes[ 'data-mw' ] = JSON.stringify( { caption: translatedCaption } );
			}
			dataCX.adapted = true;
			this.node.attributes[ 'data-cx' ] = JSON.stringify( dataCX );
			// We are not adapting the image URL for inline image. We don't get the child nodes of
			// this figure-inline unless it is considered a block tag as per our linear model.
			// But considering figure-inline as block is fundamentally wrong, it cause sentence
			// segmentation errors too.
			return this.node;
		}

		if ( !sourceImage ) {
			throw new Error( 'img tag not found in the figure with mw:Image/Thumb for id: ' + this.node.attributes.id );
		}

		this.sourceResource = sourceImage.attributes.resource;
		this.adaptImageAlignment();

		dataCX.imageSource = sourceImage.attributes.src;
		dataCX.resource = this.sourceResource;

		if ( this.isCommonsImage( sourceImage.attributes.src ) ) {
			let namespaceAlias = await this.api.getNamespaceAlias( 'File', this.targetLanguage );
			let targetResource = this.sourceResource.replace( /^(\.\.?\/)*([^:]+)(:)/, '$1' + namespaceAlias + '$3' );
			sourceImage.attributes.resource = targetResource;

			// Image does not have a link when it is created with "link=".
			if ( imageLink ) {
				imageLink.attributes.href = targetResource;
			}

			dataCX.adapted = true;
		}

		this.node.attributes[ 'data-cx' ] = JSON.stringify( dataCX );

		return this.node;
	}
}

MWImage.matchTagNames = [ 'figure', 'figure-inline' ];
MWImage.matchRdfaTypes = [ 'mw:Image', 'mw:Image/Thumb', 'mw:Image/Frame', 'mw:Image/Frameless' ];

module.exports = MWImage;
