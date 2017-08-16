'use strict';

var Doc = require( './Doc.js' ),
	TextBlock = require( './TextBlock.js' ),
	TextChunk = require( './TextChunk.js' );

/**
 * A document builder
 *
 * @class
 *
 * @constructor
 * @param {Builder} [parent] Parent document builder
 * @param {Object} [wrapperTag] tag that wraps document (if there is a parent)
 */
function Builder( parent, wrapperTag ) {
	this.blockTags = [];
	// Stack of annotation tags
	this.inlineAnnotationTags = [];
	// The height of the annotation tags that have been used, minus one
	this.inlineAnnotationTagsUsed = 0;
	this.doc = new Doc( wrapperTag || null );
	this.textChunks = [];
	this.parent = parent || null;
}

Builder.prototype.createChildBuilder = function ( wrapperTag ) {
	return new Builder( this, wrapperTag );
};

Builder.prototype.pushBlockTag = function ( tag ) {
	this.finishTextBlock();
	this.blockTags.push( tag );
	this.doc.addItem( 'open', tag );
};

Builder.prototype.popBlockTag = function ( tagName ) {
	var tag = this.blockTags.pop();
	if ( !tag || tag.name !== tagName ) {
		throw new Error(
			'Mismatched block tags: open=' + ( tag && tag.name ) + ', close=' + tagName
		);
	}
	this.finishTextBlock();
	this.doc.addItem( 'close', tag );
	return tag;
};

Builder.prototype.pushInlineAnnotationTag = function ( tag ) {
	this.inlineAnnotationTags.push( tag );
};

Builder.prototype.popInlineAnnotationTag = function ( tagName ) {
	var tag, textChunk, chunkTag, i, replace, whitespace;
	tag = this.inlineAnnotationTags.pop();
	if ( this.inlineAnnotationTagsUsed === this.inlineAnnotationTags.length ) {
		this.inlineAnnotationTagsUsed--;
	}
	if ( !tag || tag.name !== tagName ) {
		throw new Error(
			'Mismatched inline tags: open=' + ( tag && tag.name ) + ', close=' + tagName
		);
	}

	if ( !Object.keys( tag.attributes ).length ) {
		// Skip tags which have attributes, content or both from further check to
		// see if we want to keep inline content. Else we assume that, if this tag has
		// whitespace or empty content, it is ok to remove it from resulting document.
		// But if it has attributes, we make sure that there are inline content blocks to
		// avoid them missing in resulting document.
		// See T104539
		return tag;
	}
	// Check for empty/whitespace-only data span. Replace as inline content
	replace = true;
	whitespace = [];
	for ( i = this.textChunks.length - 1; i >= 0; i-- ) {
		textChunk = this.textChunks[ i ];
		chunkTag = textChunk.tags[ textChunk.tags.length - 1 ];
		if ( !chunkTag || chunkTag !== tag ) {
			break;
		}
		if ( textChunk.text.match( /\S/ ) || textChunk.inlineContent ) {
			replace = false;
			break;
		}
		whitespace.push( textChunk.text );
	}
	if ( replace &&
		( tag.attributes[ 'data-mw' ] ||
			tag.attributes[ 'data-parsoid' ] ||
			// Allow empty <a rel='mw:ExtLink'></a> because REST API v1 can output links with
			// no link text (which then get a CSS generated content numbered reference).
			( tag.name === 'a' && tag.attributes.rel === 'mw:ExtLink' )
		)
	) {
		// truncate list and add data span as new sub-Doc.
		this.textChunks.length = i + 1;
		whitespace.reverse();
		this.addInlineContent(
			new Doc()
				.addItem( 'open', tag )
				.addItem( 'textblock', new TextBlock(
					[ new TextChunk( whitespace.join( '' ), [] ) ]
				) )
				.addItem( 'close', tag )
		);
	}
	return tag;
};

Builder.prototype.addTextChunk = function ( text ) {
	this.textChunks.push( new TextChunk( text, this.inlineAnnotationTags.slice() ) );
	this.inlineAnnotationTagsUsed = this.inlineAnnotationTags.length;
};

/**
 * Add content that doesn't need linearizing, to appear inline
 *
 * @method
 * @param {Object} content Sub-document or empty SAX tag
 */
Builder.prototype.addInlineContent = function ( content ) {
	this.textChunks.push( new TextChunk( '', this.inlineAnnotationTags.slice(), content ) );
	this.inlineAnnotationTagsUsed = this.inlineAnnotationTags.length;
};

Builder.prototype.finishTextBlock = function () {
	var i, len, textChunk,
		whitespaceOnly = true,
		whitespace = [];
	if ( this.textChunks.length === 0 ) {
		return;
	}
	for ( i = 0, len = this.textChunks.length; i < len; i++ ) {
		textChunk = this.textChunks[ i ];
		if ( textChunk.inlineContent || textChunk.text.match( /\S/ ) ) {
			whitespaceOnly = false;
			whitespace = undefined;
			break;
		} else {
			whitespace.push( this.textChunks[ i ].text );
		}
	}
	if ( whitespaceOnly ) {
		this.doc.addItem( 'blockspace', whitespace.join( '' ) );
	} else {
		this.doc.addItem( 'textblock', new TextBlock( this.textChunks ) );
	}
	this.textChunks = [];
};

module.exports = Builder;
