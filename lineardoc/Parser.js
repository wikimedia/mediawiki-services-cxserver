'use strict';

var SAXParser = require( 'sax' ).SAXParser,
	Builder = require( './Builder.js' ),
	Utils = require( './Utils.js' ),
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
	'img', 'br'
 ];

/**
 * Parser to read an HTML stream into a Doc
 * @class
 *
 * @constructor
 * @param {Object} options Options
 */
function Parser( options ) {
	SAXParser.call( this, false, {
		lowercase: true
	} );
	this.options = options || {};
}

util.inherits( Parser, SAXParser );

Parser.prototype.init = function () {
	this.rootBuilder = new Builder();
	this.builder = this.rootBuilder;
};

Parser.prototype.onopentag = function ( tag ) {
	if ( this.options.isolateSegments && Utils.isSegment( tag ) ) {
		this.builder.pushBlockTag( {
			name: 'div',
			attributes: {
				class: 'cx-segment-block'
			}
		} );
	}
	if ( Utils.isReference( tag ) ) {
		// Start a reference: create a child builder, and move into it
		this.builder = this.builder.createChildBuilder( tag );
	} else if ( Utils.isInlineEmptyTag( tag.name ) ) {
		this.builder.addInlineContent( tag );
	} else if ( this.isInlineAnnotationTag( tag.name ) ) {
		this.builder.pushInlineAnnotationTag( tag );
	} else {
		this.builder.pushBlockTag( tag );
	}
};

Parser.prototype.onclosetag = function ( tagName ) {
	var tag,
		isAnn = this.isInlineAnnotationTag( tagName );
	if ( Utils.isInlineEmptyTag( tagName ) ) {
		return;
	} else if ( isAnn && this.builder.inlineAnnotationTags.length > 0 ) {
		tag = this.builder.popInlineAnnotationTag( tagName );
		if ( this.options.isolateSegments && Utils.isSegment( tag ) ) {
			this.builder.popBlockTag( 'div' );
		}
	} else if ( isAnn && this.builder.parent !== null ) {
		// In a sub document: should be a span that closes a reference
		if ( tagName !== 'span' ) {
			throw new Error( 'Expected close reference span, got "' + tagName + '"' );
		}
		this.builder.finishTextBlock();
		this.builder.parent.addInlineContent( this.builder.doc );
		// Finished with child now. Move back to the parent builder
		this.builder = this.builder.parent;
	} else if ( !isAnn ) {
		this.builder.popBlockTag( tagName );
	} else {
		throw new Error( 'Unexpected close tag: ' + tagName );
	}
};

Parser.prototype.ontext = function ( text ) {
	this.builder.addTextChunk( text );
};

/**
 * Determine whether a tag is an inline annotation
 *
 * @private
 * @param {string} tagName The name of the tag (lowercase)
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
