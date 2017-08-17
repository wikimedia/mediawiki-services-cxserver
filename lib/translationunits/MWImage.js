'use strict';

const cxutil = require( '../util.js' ),
	TranslationUnit = require( './TranslationUnit.js' ),
	languageData = require( 'language-data' ),
	MWApiRequestManager = require( '../mw/ApiRequestManager.js' ),
	CommonsFilePathPrefix = '//upload.wikimedia.org/wikipedia/commons/';

class MWImage extends TranslationUnit {
	constructor( node, sourceLanguage, targetLanguage, context ) {
		super( node, sourceLanguage, targetLanguage, context );
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
}

MWImage.prototype.adapt = cxutil.async( function* () {
	var i, len, chunk, sourceImage, imageLink, targetResource, namespaceAlias;

	for ( i = 0, len = this.node.children.textChunks.length; i < len; i++ ) {
		chunk = this.node.children.textChunks[ i ];
		if ( chunk.tags[ 0 ].name === 'a' ) {
			imageLink = chunk.tags[ 0 ];
		}
		if ( chunk.inlineContent && chunk.inlineContent.name === 'img' ) {
			sourceImage = chunk.inlineContent;
			break;
		}
	}

	if ( !sourceImage ) {
		throw new Error( 'img tag not found in the figure with mw:Image/Thumb for id: ' + this.node.attributes.id );
	}

	this.sourceResource = sourceImage.attributes[ 'resource' ];
	this.adaptImageAlignment();

	if ( this.isCommonsImage( sourceImage.attributes[ 'src' ] ) ) {
		namespaceAlias = yield new MWApiRequestManager( this.context ).getNamespaceAlias( 'File', this.targetLanguage );
		targetResource = this.sourceResource.replace( /^(\.\.?\/)*(.+)(:)/, '$1' + namespaceAlias + '$3' );
		sourceImage.attributes[ 'resource' ] = imageLink.attributes[ 'href' ] = targetResource;
	} else {
		// TODO: This format is not decided yet. We do need to inform client about failed
		// adaptations somehow.
		this.node.attributes[ 'data-cx' ] = JSON.stringify( {
			adapted: false,
			imageSource: this.imageSource,
			resource: this.sourceResource
		} );
	}
	return this.node;
} );

MWImage.matchTagNames = [ 'figure' ];
MWImage.matchRdfaTypes = [ 'mw:Image', 'mw:Image/Thumb', 'mw:Image/Frame', 'mw:Image/Frameless' ];

module.exports = MWImage;
