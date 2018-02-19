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
		if ( Utils.isReference( tag ) ) {
			// Start a reference: create a child builder, and move into it
			this.builder = this.builder.createChildBuilder( tag );
		} else if ( Utils.isInlineEmptyTag( tag.name ) ) {
			this.builder.addInlineContent( tag, this.contextualizer.canSegment() );
		} else if ( this.isInlineAnnotationTag( tag.name ) ) {
			this.builder.pushInlineAnnotationTag( tag );
		} else {
			if ( this.options.wrapSections &&
				this.contextualizer.getContext() === 'section' &&
				tag.name !== 'section'
			) {
				this.builder.pushBlockTag( {
					name: 'section',
					attributes: {
						rel: 'cx:Section'
					}
				} );
			}
			this.builder.pushBlockTag( tag );
		}
		this.allTags.push( tag );
		this.contextualizer.onOpenTag( tag );
	}

	onclosetag( tagName ) {
		var tag = this.allTags.pop(),
			isAnn = this.isInlineAnnotationTag( tagName );
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
			this.builder.parent.addInlineContent( this.builder.doc, this.contextualizer.canSegment() );
			// Finished with child now. Move back to the parent builder
			this.builder = this.builder.parent;
		} else if ( !isAnn ) {
			this.builder.popBlockTag( tagName );
			if ( this.options.wrapSections &&
				this.contextualizer.getContext() === 'section' &&
				tag.name !== 'section'
			) {
				this.builder.popBlockTag( 'section' );
			}
		} else {
			throw new Error( 'Unexpected close tag: ' + tagName );
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
