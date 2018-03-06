'use strict';

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
	'img', 'br', 'figure-inline'
];

/**
 * Parser to read an HTML stream into a Doc
 *
 * @class
 *
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
		// context for each tag currently open; undefined|'verbatim'|'media'|'contentBranch'|'section'
		this.contexts = [];
		// Transclusion context, if any. Value will be the about attribute value.
		this.transclusionContext = null;
	}

	onopentag( tag ) {
		if ( this.options.isolateSegments && Utils.isSegment( tag ) ) {
			this.builder.pushBlockTag( {
				name: 'div',
				attributes: {
					'class': 'cx-segment-block'
				}
			} );
		}

		// Check if this a transclusion fragment for an already started transclusion context
		if ( this.transclusionContext && this.transclusionContext !== tag.attributes.about &&
			this.canSectionWrap( tag )
		) {
			this.endSection();
			// transclusion context has ended.
			this.transclusionContext = false;
		}

		if ( Utils.isReference( tag ) ) {
			// Start a reference: create a child builder, and move into it
			this.builder = this.builder.createChildBuilder( tag );
		} else if ( Utils.isInlineEmptyTag( tag.name ) ) {
			if ( this.canSectionWrap( tag ) && Utils.isTransclusion( tag ) ) {
				// Inline empty tags like <link> tags can be part of a transclusion fragment,
				// If it is direct child of body tag.
				this.startSection();
			}
			this.builder.addInlineContent( tag, this.contextualizer.canSegment() );
		} else if ( this.isInlineAnnotationTag( tag.name ) ) {
			if ( this.canSectionWrap( tag ) && Utils.isTransclusion( tag ) ) {
				// Inline annotations like span tags can be part of a transclusion fragment,
				// If it is direct child of body tag.
				this.startSection();
			}
			this.builder.pushInlineAnnotationTag( tag );
		} else {
			// Opening block tag
			if ( this.canSectionWrap( tag ) && !this.transclusionContext ) {
				this.startSection();
			}
			this.builder.pushBlockTag( tag );
		}

		this.allTags.push( tag );
		this.contextualizer.onOpenTag( tag );

		if ( !this.transclusionContext && Utils.isTransclusion( tag ) ) {
			// Tag is a transclusion. Initiate a transclusion context.
			this.transclusionContext = tag.attributes.about;
		}
	}

	onclosetag( tagName ) {
		var tag = this.allTags.pop(),
			isAnn = this.isInlineAnnotationTag( tagName );

		this.contextualizer.onCloseTag( tag );

		if ( Utils.isInlineEmptyTag( tagName ) ) {
			if ( this.canSectionWrap( tag ) && Utils.isTransclusion( tag ) && !this.transclusionContext ) {
				// Close the section around an inline empty transclusion tag in a section context.
				this.endSection();
			}
			return;
		} else if ( isAnn && this.builder.inlineAnnotationTags.length > 0 ) {
			if ( this.canSectionWrap( tag ) && Utils.isTransclusion( tag ) && !this.transclusionContext ) {
				// Close the section around an inline annotation in a section context.
				this.endSection();
			}
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
			this.builder.parent.addInlineContent( this.builder.doc, this.contextualizer.canSegment() );
			// Finished with child now. Move back to the parent builder
			this.builder = this.builder.parent;
		} else if ( !isAnn ) {
			// Close section for any remaining open translationContext before body ends
			if ( tagName === 'body' && this.transclusionContext ) {
				this.endSection();
				this.transclusionContext = false;
			}

			this.builder.popBlockTag( tagName );

			if ( this.canSectionWrap( tag ) && !this.transclusionContext ) {
				this.endSection();
			}
		} else {
			throw new Error( 'Unexpected close tag: ' + tagName );
		}
	}

	canSectionWrap( tag ) {
		let context = this.contextualizer.getContext();
		let childContext = this.contextualizer.getChildContext( tag );

		return this.options.wrapSections &&
			context === 'section' &&
			childContext !== 'section';
	}

	startSection() {
		if ( this.options.wrapSections ) {
			this.builder.pushBlockTag( {
				name: 'section',
				attributes: {
					rel: 'cx:Section'
				} }
			);
		}
	}

	endSection() {
		if ( this.options.wrapSections ) {
			this.builder.popBlockTag( 'section' );
		}
	}

	ontext( text ) {
		this.builder.addTextChunk( text, this.contextualizer.canSegment() );
	}

}
/**
 * Determine whether a tag is an inline annotation
 *
 * @private
 * @param {string[]} tagArray Array of tags in lowercase.
 * @return {boolean} Whether the tag is an inline annotation
 */
Parser.prototype.isInlineAnnotationTag = ( function ( tagArray ) {
	var nonInlineTags = {};

	for ( let i = 0, len = tagArray.length; i < len; i++ ) {
		nonInlineTags[ tagArray[ i ] ] = true;
	}
	return ( tagName ) => !nonInlineTags[ tagName ];
}( blockTags ) );

module.exports = Parser;
