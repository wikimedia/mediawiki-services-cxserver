'use strict';

var SAXParser = require( 'sax' ).SAXParser,
	Builder = require( './Builder' ),
	Utils = require( './Utils' ),
	util = require( 'util' ),
	blockTags;

blockTags = [
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
 * @constructor
 * @param {Contextualizer} contextualizer Tag contextualizer
 * @param {Object} options Options
 */
function Parser( contextualizer, options ) {
	SAXParser.call( this, false, {
		lowercase: true
	} );
	this.contextualizer = contextualizer;
	this.options = options || {};
}

util.inherits( Parser, SAXParser );

Parser.prototype.init = function () {
	this.rootBuilder = new Builder();
	this.builder = this.rootBuilder;
	// Stack of tags currently open
	this.allTags = [];
	// context for each tag currently open; undefined|'verbatim'|'media'|'contentBranch'
	this.contexts = [];
};

Parser.prototype.onopentag = function ( tag ) {
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
		this.builder.pushBlockTag( tag );
	}
	this.allTags.push( tag );
	this.contextualizer.onOpenTag( tag );
};

Parser.prototype.onclosetag = function ( tagName ) {
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
	} else {
		throw new Error( 'Unexpected close tag: ' + tagName );
	}
};

Parser.prototype.ontext = function ( text ) {
	this.builder.addTextChunk( text, this.contextualizer.canSegment() );
};

/**
 * Determine whether a tag is an inline annotation
 *
 * @private
 * @param {string[]} tagArray Array of tags in lowercase.
 * @return {boolean} Whether the tag is an inline annotation
 */
Parser.prototype.isInlineAnnotationTag = ( function ( tagArray ) {
	var i, len,
		nonInlineTags = {};

	for ( i = 0, len = tagArray.length; i < len; i++ ) {
		nonInlineTags[ tagArray[ i ] ] = true;
	}
	return function ( tagName ) {
		return !nonInlineTags[ tagName ];
	};
}( blockTags ) );

module.exports = Parser;
