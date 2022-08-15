'use strict';

const Doc = require( './Doc' );
const Utils = require( './Utils' );
const TextBlock = require( './TextBlock' );
const TextChunk = require( './TextChunk' );

/**
 * A document builder
 *
 * @class
 */
class Builder {
	/**
	 * @param {Builder} [parent] Parent document builder
	 * @param {Object} [wrapperTag] tag that wraps document (if there is a parent)
	 */
	constructor( parent, wrapperTag ) {
		this.blockTags = [];
		// Stack of annotation tags
		this.inlineAnnotationTags = [];
		// The height of the annotation tags that have been used, minus one
		this.inlineAnnotationTagsUsed = 0;
		this.doc = new Doc( wrapperTag || null );
		this.textChunks = [];
		this.isBlockSegmentable = true;
		this.parent = parent || null;
	}

	createChildBuilder( wrapperTag ) {
		return new Builder( this, wrapperTag );
	}

	pushBlockTag( tag ) {
		this.finishTextBlock();
		this.blockTags.push( tag );
		if ( this.isIgnoredTag( tag ) ) {
			return;
		}
		if ( tag.name === 'figure' ) {
			tag.attributes.rel = 'cx:Figure';
		}
		this.doc.addItem( 'open', tag );
	}

	isSection( tag ) {
		return tag.name === 'section' && tag.attributes[ 'data-mw-section-id' ];
	}

	isIgnoredTag( tag ) {
		return this.isSection( tag ) || this.isCategory( tag );
	}

	isCategory( tag ) {
		return tag.name === 'link' && tag.attributes.rel &&
			// We add the spaces before and after to ensure matching on the "word" mw:PageProp/Category
			// without additional content. This is technically not necessary (we don't generate
			// mw:PageProp/Category/SomethingElse) nor entirely correct (attributes values could be separated by other
			// characters than 0x20), but provides a bit of future-proofing.
			( ' ' + tag.attributes.rel + ' ' ).includes( ' mw:PageProp/Category ' ) && !tag.attributes.about;
	}

	popBlockTag( tagName ) {
		const tag = this.blockTags.pop();
		if ( !tag || tag.name !== tagName ) {
			throw new Error(
				'Mismatched block tags: open=' + ( tag && tag.name ) + ', close=' + tagName
			);
		}
		this.finishTextBlock();

		if ( !this.isIgnoredTag( tag ) ) {
			this.doc.addItem( 'close', tag );
		}

		return tag;
	}

	pushInlineAnnotationTag( tag ) {
		this.inlineAnnotationTags.push( tag );
	}

	popInlineAnnotationTag( tagName ) {
		let i;
		const tag = this.inlineAnnotationTags.pop();
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
			return;
		}
		// Check for empty/whitespace-only data tags. Replace as inline content
		let replace = true;
		const whitespace = [];
		for ( i = this.textChunks.length - 1; i >= 0; i-- ) {
			const textChunk = this.textChunks[ i ];
			const chunkTag = textChunk.tags[ textChunk.tags.length - 1 ];
			if ( !chunkTag ) {
				break;
			}
			if ( textChunk.text.match( /\S/ ) || textChunk.inlineContent || chunkTag !== tag ) {
				// textChunk has non whitespace content, Or it has child tags.
				replace = false;
				break;
			}
			whitespace.push( textChunk.text );
		}

		// Allow empty external links because REST API v1 can output links with
		// no link text (which then get a CSS generated content numbered reference).
		if ( replace && ( Utils.isReference( tag ) || Utils.isExternalLink( tag ) || Utils.isTransclusion( tag ) ) ) {
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
		return;
	}

	addTextChunk( text, canSegment ) {
		this.textChunks.push( new TextChunk( text, this.inlineAnnotationTags.slice() ) );
		this.inlineAnnotationTagsUsed = this.inlineAnnotationTags.length;
		// Inside a textblock, if a textchunk becomes segmentable, unlike inline tags,
		// the textblock becomes segmentable. See T195768
		this.isBlockSegmentable = canSegment;
	}

	/**
	 * Add content that doesn't need linearizing, to appear inline
	 *
	 * @method
	 * @param {Object} content Sub-document or empty SAX tag
	 * @param {boolean} canSegment
	 */
	addInlineContent( content, canSegment ) {
		// If the content is a category tag, capture it separately and don't add to doc.
		if ( this.isCategory( content ) ) {
			this.doc.categories.push( content );
			return;
		}
		this.textChunks.push( new TextChunk( '', this.inlineAnnotationTags.slice(), content ) );
		if ( !canSegment ) {
			this.isBlockSegmentable = false;
		}
		this.inlineAnnotationTagsUsed = this.inlineAnnotationTags.length;
	}

	finishTextBlock() {
		let whitespace = [], whitespaceOnly = true;

		if ( this.textChunks.length === 0 ) {
			return;
		}
		for ( let i = 0, len = this.textChunks.length; i < len; i++ ) {
			const textChunk = this.textChunks[ i ];
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
			this.doc.addItem( 'textblock', new TextBlock( this.textChunks, this.isBlockSegmentable ) );
		}
		this.textChunks = [];
		this.isBlockSegmentable = true;
	}

}

module.exports = Builder;
