'use strict';

/**
 * @external Contextualizer
 */

const SAXParser = require( 'sax' ).SAXParser;
const Builder = require( './Builder' );
const Utils = require( './Utils' );

const blockTags = [
	'html', 'head', 'body', 'script',
	// head tags
	// In HTML5+RDFa, link/meta are actually allowed anywhere in the body, and are to be
	// treated as void flow content (like <br> and <img>).
	'title', 'style', 'meta', 'link', 'noscript', 'base',
	// non-visual content
	'audio', 'data', 'datagrid', 'datalist', 'dialog', 'eventsource', 'form',
	'iframe', 'main', 'menu', 'menuitem', 'optgroup', 'option',
	// paragraph
	'div', 'p',
	// tables
	'table', 'tbody', 'thead', 'tfoot', 'caption', 'th', 'tr', 'td',
	// lists
	'ul', 'ol', 'li', 'dl', 'dt', 'dd',
	// HTML5 heading content
	'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'hgroup',
	// HTML5 sectioning content
	'article', 'aside', 'body', 'nav', 'section', 'footer', 'header', 'figure',
	'figcaption', 'fieldset', 'details', 'blockquote',
	// other
	'hr', 'button', 'canvas', 'center', 'col', 'colgroup', 'embed',
	'map', 'object', 'pre', 'progress', 'video',
	// non-annotation inline tags
	'img', 'br'
];

/**
 * Parser to read an HTML stream into a Doc
 *
 * @class
 */
class Parser extends SAXParser {
	/**
	 * @param {Contextualizer} contextualizer Tag contextualizer
	 * @param {Object} options Options
	 */
	constructor( contextualizer, options ) {
		super( false, {
			lowercase: true
		} );
		this.contextualizer = contextualizer;
		this.options = options || {};
	}

	init() {
		this.rootBuilder = new Builder();
		this.builder = this.rootBuilder;
		// Stack of tags currently open
		this.allTags = [];
	}

	onopentag( tag ) {
		if (
			// Check if this tag is a child tag of a removable tag
			this.contextualizer.getContext() === 'removable' ||
			// Check if the tag is removable. Note that it is not added to contextualizer yet.
			this.contextualizer.isRemovable( tag )
		) {
			this.allTags.push( tag );
			this.contextualizer.onOpenTag( tag );
			return;
		}

		if ( this.options.isolateSegments && Utils.isSegment( tag ) ) {
			this.builder.pushBlockTag( {
				name: 'div',
				attributes: {
					class: 'cx-segment-block'
				}
			} );
		}

		if ( Utils.isReference( tag ) || Utils.isMath( tag ) ) {
			// Start a reference: create a child builder, and move into it
			this.builder = this.builder.createChildBuilder( tag );
		} else if ( Utils.isInlineEmptyTag( tag.name ) ) {
			this.builder.addInlineContent(
				tag, this.contextualizer.canSegment()
			);
		} else if ( this.isInlineAnnotationTag( tag.name, Utils.isTransclusion( tag ) ) ) {
			this.builder.pushInlineAnnotationTag( tag );
		} else {
			this.builder.pushBlockTag( tag );
		}

		this.allTags.push( tag );
		this.contextualizer.onOpenTag( tag );
	}

	onclosetag( tagName ) {
		const tag = this.allTags.pop(),
			isAnn = this.isInlineAnnotationTag( tagName, Utils.isTransclusion( tag ) );

		if ( this.contextualizer.isRemovable( tag ) || this.contextualizer.getContext() === 'removable' ) {
			this.contextualizer.onCloseTag( tag );
			return;
		}

		this.contextualizer.onCloseTag( tag );

		if ( Utils.isInlineEmptyTag( tagName ) ) {
			return;
		} else if ( isAnn && this.builder.inlineAnnotationTags.length > 0 ) {
			this.builder.popInlineAnnotationTag( tagName );
			if ( this.options.isolateSegments && Utils.isSegment( tag ) ) {
				this.builder.popBlockTag( 'div' );
			}
		} else if ( isAnn && this.builder.parent !== null ) {
			// In a sub document: should be a span or sup that closes a reference
			if ( tagName !== 'span' && tagName !== 'sup' ) {
				throw new Error( 'Expected close reference - span or sup tags, got "' + tagName + '"' );
			}
			this.builder.finishTextBlock();
			this.builder.parent.addInlineContent(
				this.builder.doc, this.contextualizer.canSegment()
			);
			// Finished with child now. Move back to the parent builder
			this.builder = this.builder.parent;
		} else if ( !isAnn ) {
			// Block level tag close
			if ( tagName === 'p' && this.contextualizer.canSegment() ) {
				// Add an empty textchunk before the closing block tag to flush segmentation contexts
				// For example, transclusion based references at the end of paragraphs
				this.builder.addTextChunk( '', this.contextualizer.canSegment() );
			}
			this.builder.popBlockTag( tagName );
		} else {
			throw new Error( 'Unexpected close tag: ' + tagName );
		}
	}

	ontext( text ) {
		if ( this.contextualizer.getContext() === 'removable' ) {
			return;
		}
		this.builder.addTextChunk( text, this.contextualizer.canSegment() );
	}

	onscript( text ) {
		this.builder.addTextChunk( text, this.contextualizer.canSegment() );
	}

	/**
	 * Determine whether a tag is an inline annotation or not
	 *
	 * @param {string} tagName Tag name in lowercase
	 * @param {boolean} isTransclusion If the tag is transclusion
	 * @return {boolean} Whether the tag is an inline annotation
	 */
	isInlineAnnotationTag( tagName, isTransclusion ) {
		const context = this.contextualizer.getContext();
		// <span> inside a media context acts like a block tag wrapping another block tag <video>
		// See https://www.mediawiki.org/wiki/Specs/HTML/1.7.0#Audio/Video
		if ( tagName === 'span' && context === 'media' ) {
			return false;
		}

		// Audio or Video are block tags. But in a media-inline context they are inline.
		if ( ( tagName === 'audio' || tagName === 'video' ) && context === 'media-inline' ) {
			return true;
		}

		// Styles are usually block tags, but sometimes style tags are used as transclusions
		// Example: T217585. In such cases treat styles as inline to avoid wrong segmentations.
		if ( tagName === 'style' && isTransclusion ) {
			return true;
		}
		// All tags that are not block tags are inline annotation tags.
		return !blockTags.includes( tagName );
	}
}

module.exports = Parser;
