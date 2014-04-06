'use strict';

var SAXParser = require( 'sax' ).SAXParser,
	util = require( 'util' ),
	isInlineAnnotationTag;

/**
 * Find all matches of regex in text, calling callback with each match object
 *
 * @param {string} text The text to search
 * @param {Regex} regex The regex to search; should be created for this function call
 * @param {Function} callback Function to call with each match
 * @return {Array} The return values from the callback
 */
function findAll( text, regex, callback ) {
	var match, boundary,
		boundaries = [];
	while ( true ) {
		match = regex.exec( text );
		if ( match === null ) {
			break;
		}
		boundary = callback( text, match );
		if ( boundary !== null ) {
			boundaries.push( boundary );
		}
	}
	return boundaries;
}

/**
 * Escape text for inclusion in HTML, not inside a tag
 * @private
 * @param {string} str String to escape
 * @return {string} Escaped version of the string
 */
function esc( str ) {
	return str.replace( /[&<>]/g, function ( ch ) {
		return '&#' + ch.charCodeAt( 0 ) + ';';
	} );
}

/**
 * Escape text for inclusion inside an HTML attribute
 * @private
 * @param {string} str String to escape
 * @return {string} Escaped version of the string
 */
function escAttr( str ) {
	return str.replace( /["'&<>]/g, function ( ch ) {
		return '&#' + ch.charCodeAt( 0 ) + ';';
	} );
}

/**
 * Render a SAX open tag into an HTML string
 * @private
 * @param {Object} tag Tag to render
 * @return {string} Html representation of open tag
 */
function getOpenTagHtml( tag ) {
	var attr, html;
	html = [ '<' + esc( tag.name ) ];
	for ( attr in tag.attributes ) {
		html.push( ' ' + esc( attr ) + '="' + escAttr( tag.attributes[ attr ] ) + '"' );
	}
	if ( tag.isSelfClosing ) {
		html.push( ' /' );
	}
	html.push( '>' );
	return html.join( '' );
}

/**
 * Render a SAX close tag into an HTML string
 * @private
 * @param {Object} tag Name of tag to close
 * @return {string} Html representation of close tag
 */
function getCloseTagHtml( tag ) {
	if ( tag.isSelfClosing ) {
		return '';
	}
	return '</' + esc( tag.name ) + '>';
}

/**
 * Represent an inline tag as a single XML attribute, for debugging purposes
 *
 * @private
 * @param {Object[]} tagArray SAX open tags
 * @returns [string[]] Tag names
 */
function dumpTags( tagArray ) {
	var i, len, tag, attr, attrDumps,
		tagDumps = [];
	if ( !tagArray ) {
		return '';
	}
	for ( i = 0, len = tagArray.length; i < len; i++ ) {
		tag = tagArray[ i ];
		attrDumps = [];
		for ( attr in tag.attributes ) {
			attrDumps.push( attr + '=' + escAttr( tag.attributes[ attr ] ) );
		}
		tagDumps.push(
			tag.name + ( attrDumps.length ? ':' : '' ) + attrDumps.join( ',' )
		);
	}
	if ( !tagDumps ) {
		return '';
	}
	return tagDumps.join( ' ' );
}

/**
 * Detect whether this is a mediawiki reference span
 * @param {Object} tag SAX open tag object
 * @return {boolean} Whether the tag is a mediawiki reference span
 */
function isReference( tag ) {
	return tag.name === 'span' && tag.attributes.typeof === 'mw:Extension/ref';
}

/**
 * Determine whether a tag is an inline empty tag
 *
 * @private
 * @param {string} tagName The name of the tag (lowercase)
 * @returns {boolean} Whether the tag is an inline empty tag
 */
function isInlineEmptyTag( tagName ) {
	return tagName === 'br' || tagName === 'img';
}

/**
 * Determine whether a tag is an inline annotation
 *
 * @private
 * @param {string} tagName The name of the tag (lowercase)
 * @returns {boolean} Whether the tag is an inline annotation
 */
isInlineAnnotationTag = ( function ( tagArray ) {
	var i, len,
		nonInlineTags = {};
	for ( i = 0, len = tagArray.length; i < len; i++ ) {
		nonInlineTags[ tagArray[ i ] ] = true;
	}
	return function ( tagName ) {
		return !nonInlineTags[ tagName ];
	};
}( [
	'html', 'head', 'body', 'script',
	// head tags
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
        'map', 'object', 'pre', 'progress', 'video', 'link',
	// non-annotation inline tags
	'img', 'br'
 ] ) );

/**
 * A chunk of uniformly-annotated inline text
 *
 * The annotations consist of a list of inline tags (<a>, <i> etc), and an
 * optional "inline element" (br/img tag, or a sub-document e.g. for a
 * reference span). The tags and/or reference apply to the whole text;
 * therefore text with varying markup must be split into multiple chunks.
 * @class
 *
 * @constructor
 * @param {string} text Plaintext in the chunk (can be '')
 * @param {Object[]} array of SAX open tag objects, for the applicable tags
 * @param {Doc|object} [inlineElement] tag or sub-doc
 */
function TextChunk( text, tags, inlineElement ) {
	this.text = text;
	this.tags = tags;
	this.inlineElement = inlineElement;
}

/**
 * A block of annotated inline text
 * @class
 *
 * @constructor
 */
function TextBlock( textChunks ) {
	this.textChunks = textChunks;
}

/**
 * Return plain text representation of the text block
 * @return {string} Plain text representation
 */
TextBlock.prototype.getPlainText = function () {
	var i, len,
		text = [];
	for ( i = 0, len = this.textChunks.length; i < len; i++ ) {
		text.push( this.textChunks[ i ].text );
	}
	return text.join( '' );
};

/**
 * Return HTML representation of the text block
 * @return {string} Plain text representation
 */
TextBlock.prototype.getHtml = function () {
	var i, iLen, j, jLen, textChunk, matchTop, oldTags,
		html = [];

	// Start with no tags open
	oldTags = [];
	for ( i = 0, iLen = this.textChunks.length; i < iLen; i++ ) {
		textChunk = this.textChunks[ i ];

		// Compare tag stacks; render close tags and open tags as necessary
		// Find the highest offset up to which the tags match on
		matchTop = -1;
		for ( j = 0, jLen = Math.min( oldTags.length, textChunk.tags.length ); j < jLen; j++ ) {
			if ( oldTags[ j ] === textChunk.tags[ j ] ) {
				matchTop = j;
			} else {
				break;
			}
		}
		for ( j = oldTags.length - 1; j > matchTop; j-- ) {
			html.push( getCloseTagHtml( oldTags[ j ] ) );
		}
		for ( j = matchTop + 1, jLen = textChunk.tags.length; j < jLen; j++ ) {
			html.push( getOpenTagHtml( textChunk.tags[ j ] ) );
		}
		oldTags = textChunk.tags;

		// Now add text and inline elements
		html.push( textChunk.text );
		if ( textChunk.inlineElement ) {
			if ( textChunk.inlineElement.getHtml ) {
				// a sub-doc
				html.push( textChunk.inlineElement.getHtml() );
			} else {
				// an empty inline tag
				html.push( getOpenTagHtml( textChunk.inlineElement ) );
			}
		}
	}
	// Finally, close any remaining tags
	for ( j = oldTags.length - 1; j >= 0; j-- ) {
		html.push( getCloseTagHtml( oldTags[ j ] ) );
	}
	return html.join( '' );
};

/**
 * Add a tag to consecutive text chunks, above common tags but below others
 *
 * @private
 * @param {TextChunk[]} textChunks Consecutive text chunks
 * @param {Object} tag Tag to add
 * @return {TextChunk[]} Copy of the text chunks with the tag inserted
 */
function addCommonTag( textChunks, tag ) {
	var i, iLen, commonTags, commonTagLength, j, jLen, textChunk, tags, newTextChunks, newTags;
	if ( textChunks.length === 0 ) {
		return [];
	}
	// Find length of common tags
	commonTags = textChunks[ 0 ].tags.slice();
	for ( i = 1, iLen = textChunks.length; i < iLen; i++ ) {
		tags = textChunks[ i ].tags;
		for ( j = 0, jLen = Math.min( commonTags.length, tags.length ); j < jLen; j++ ) {
			if ( commonTags[ j ] !== tags[ j ] ) {
				break;
			}
		}
		if ( commonTags.length > j ) {
			// truncate to matched length
			commonTags.length = j;
		}
	}
	commonTagLength = commonTags.length;
	// Build new chunks with segment span inserted
	newTextChunks = [];
	for ( i = 0, iLen = textChunks.length; i < iLen; i++ ) {
		textChunk = textChunks[ i ];
		newTags = textChunk.tags.slice();
		newTags.splice( commonTagLength, 0, tag );
		newTextChunks.push( new TextChunk(
			textChunk.text,
			newTags,
			textChunk.inlineElement
		) );
	}
	return newTextChunks;
}

/**
 * Segment the text block into sentences
 * @method
 * @param {Function} getBoundaries Function taking plaintext, returning offset array
 * @return {TextBlock} Segmented version, with added span tags
 */
TextBlock.prototype.segment = function ( getBoundaries ) {
	var i, len, textChunk, boundary, relOffset,
		allTextChunks = [],
		currentTextChunks = [],
		charCount = 0,
		boundaries = getBoundaries( this.getPlainText() ),
		bPtr = 0,
		segId = 1;

	function flushChunks() {
		if ( currentTextChunks.length > 0 ) {
			allTextChunks.push.apply( allTextChunks, addCommonTag(
				currentTextChunks, {
					name: 'span',
					attributes: {
						class: 'seg s' + segId++
					}
				}
			) );
			currentTextChunks = [];
		}
	}

	for ( i = 0, len = this.textChunks.length; i < len; i++ ) {
		textChunk = this.textChunks[ i ];
		// Move boundary pointer to the boundary after the start of this chunk
		// (or beyond the end of the array if there is no such boundary)
		// Notice that if the chunk is zero-length, bPtr may already be exactly
		// at the end of the chunk, in which case bPtr won't move
		while ( bPtr < boundaries.length && boundaries[ bPtr ] < charCount ) {
			bPtr++;
		}
		boundary = boundaries[ bPtr ];

		// Get offset relative to the start of this text chunk
		relOffset = ( boundary === undefined ) ? undefined : boundary - charCount;
		if ( relOffset === 0 ) {
			// Boundary exactly at start of text
			if ( textChunk.text.length === 0 ) {
				// Zero-width: chunk lies before segment boundary
				// Don't flush chunks yet: another zero-width chunk may come
				currentTextChunks.push( textChunk );
			} else {
				// Non-zero width: chunk lies after segment boundary, so flush
				flushChunks();
				currentTextChunks.push( textChunk );
			}
		} else if ( relOffset < textChunk.text.length ) {
			// Boundary strictly inside the text: split chunk
			// Add pre-split chunk, then flush block
			currentTextChunks.push( new TextChunk(
				textChunk.text.substring( 0, relOffset ),
				textChunk.tags.slice()
			) );
			flushChunks();
			// Add post-split chunk, including ref if any
			currentTextChunks.push( new TextChunk(
				textChunk.text.substring( relOffset ),
				textChunk.tags.slice(),
				textChunk.inlineElement
			) );
		} else {
			// No boundary, or boundary after chunk: add whole chunk
			currentTextChunks.push( textChunk );
		}
		charCount += textChunk.text.length;
	}
	flushChunks();
	return new TextBlock( allTextChunks );
};

/**
 * Dump an XML Array version of the linear representation, for debugging
 *
 * @method
 * @param {string} pad Whitespace to indent XML elements
 * @return {string[]} Array that will concatenate to an XML string representation
 */
TextBlock.prototype.dumpXmlArray = function ( pad ) {
	var i, len, chunk, tagsDump, tagsAttr,
		dump = [];
	for ( i = 0, len = this.textChunks.length; i < len; i++ ) {
		chunk = this.textChunks[ i ];
		tagsDump = dumpTags( chunk.tags );
		tagsAttr = tagsDump ? ' tags="' + tagsDump + '"' : '';
		if ( chunk.text ) {
			dump.push(
				pad + '<cxtextchunk' + tagsAttr + '>' +
				esc( chunk.text ) +
				'</cxtextchunk>'
			);
		}
		if ( chunk.inlineElement ) {
			dump.push( pad + '<cxinlineelement' + tagsAttr + '>' );
			if ( chunk.inlineElement.dumpXmlArray ) {
				// sub-doc: concatenate
				dump.push.apply( dump, chunk.inlineElement.dumpXmlArray( pad + '  ' ) );
			} else {
				dump.push( pad + '  ' + '<' + chunk.inlineElement.name + '/>' );
			}
			dump.push( pad + '</cxinlineelement>' );
		}
	}
	return dump;
};

/**
 * An HTML document in linear representation.
 *
 * The document is a list of items, where each items is
 * - a block open tag (e.g. <p>); or
 * - a block close tag (e.g. </p>); or
 * - a TextBlock of annotated inline text; or
 * - non-inline whitespace
 *
 * @class
 *
 * @constructor
 */
function Doc( wrapperTag ) {
	this.items = [];
	this.wrapperTag = wrapperTag || null;
}

/**
 * Add an item to the document
 * @method
 * @param {string} type Type of item: open|close|blockspace|textBlock
 * @param {Object|string|TextBlock} item Open/close tag, space or text block
 */
Doc.prototype.addItem = function ( type, item ) {
	this.items.push( {
		type: type,
		item: item
	} );
};

/**
 * Segment the document into sentences
 * @method
 * @param {Function} getBoundaries Function taking plaintext, returning offset array
 * @return {Doc} Segmented version of document TODO: warning: *shallow copied*.
 */
Doc.prototype.segment = function ( getBoundaries ) {
	var i, len, item, textBlock,
		newDoc = new Doc();
	for ( i = 0, len = this.items.length; i < len; i++ ) {
		item = this.items[ i ];
		if ( this.items[ i ].type !== 'textblock' ) {
			newDoc.addItem( item.type, item.item );
		} else {
			textBlock = item.item;
			newDoc.addItem( 'textblock', textBlock.segment( getBoundaries ) );
		}
	}
	return newDoc;
};

/**
 * Dump an XML version of the linear representation, for debugging
 * @method
 * @return {string} XML version of the linear representation
 */
Doc.prototype.dumpXml = function () {
	return this.dumpXmlArray( '' ).join( '\n' );
};

/**
 * Dump the document in HTML format
 * @method
 * @return {string} HTML document
 */
Doc.prototype.getHtml = function () {
	var i, len, type, item, tag, space, textblock,
		html = [];
	if ( this.wrapperTag ) {
		html.push( getOpenTagHtml( this.wrapperTag ) );
	}
	for ( i = 0, len = this.items.length; i < len; i++ ) {
		type = this.items[ i ].type;
		item = this.items[ i ].item;
		if ( type === 'open' ) {
			tag = item;
			html.push( getOpenTagHtml( tag ) );
		} else if ( type === 'close' ) {
			tag = item;
			html.push( getCloseTagHtml( tag ) );
		} else if ( type === 'blockspace' ) {
			space = item;
			html.push( space );
		} else if ( type === 'textblock' ) {
			textblock = item;
			// textblock html list may be quite long, so concatenate now
			html.push( textblock.getHtml() );
		} else {
			console.error( 'Unknown item type: ', this.items[ i ] );
			throw new Error( 'Unknown item type: ' + type );
		}
	}
	if ( this.wrapperTag ) {
		html.push( getCloseTagHtml( this.wrapperTag ) );
	}
	return html.join( '' );
};

/**
 * Dump an XML Array version of the linear representation, for debugging
 * @method
 * @return {string[]} Array that will concatenate to an XML string representation
 */
Doc.prototype.dumpXmlArray = function ( pad ) {
	var i, len, type, item, tag, textBlock,
		dump = [];
	if ( this.wrapperTag ) {
		dump.push( pad + '<cxwrapper>' );
	}
	for ( i = 0, len = this.items.length; i < len; i++ ) {
		type = this.items[ i ].type;
		item = this.items[ i ].item;
		if ( type === 'open' ) {
			// open block tag
			tag = item;
			dump.push( pad + '<' + tag.name + '>' );
			if ( tag.name === 'head' ) {
				// Add a few things for easy display
				dump.push( pad + '<meta charset="UTF-8" />' );
				dump.push( pad + '<style>cxtextblock { border: solid #88f 1px }' );
				dump.push( pad + 'cxtextchunk { border-right: solid #f88 1px }</style>' );
			}
		} else if ( type === 'close' ) {
			// close block tag
			tag = item;
			dump.push( pad + '</' + tag.name + '>' );
		} else if ( type === 'blockspace' ) {
			// Non-inline whitespace
			dump.push( pad + '<cxblockspace/>' );
		} else if ( type === 'textblock' ) {
			// Block of inline text
			textBlock = item;
			dump.push( pad + '<cxtextblock>' );
			dump.push.apply( dump, textBlock.dumpXmlArray( pad + '  ' ) );
			dump.push( pad + '</cxtextblock>' );
		} else {
			console.error( 'Unknown item type: ', this.items[ i ] );
			throw new Error( 'Unknown item type: ' + type );
		}
	}
	if ( this.wrapperTag ) {
		dump.push( pad + '</cxwrapper>' );
	}
	return dump;
};

/**
 * Extract the text segments from the document
 * @method
 * @return {string[]} balanced html fragments, one per segment
 */
Doc.prototype.getSegments = function () {
	var i, len, textblock,
		segments = [];
	for ( i = 0, len = this.items.length; i < len; i++ ) {
		if ( this.items[ i ].type !== 'textblock' ) {
			continue;
		}
		textblock = this.items[ i ].item;
		segments.push( textblock.getHtml() );
	}
	return segments;
};

/**
 * A document builder
 * @class
 *
 * @constructor
 * @param {Builder} [parent] Parent document builder
 * @param {Object} [wrapperTag] tag that wraps document (if there is a parent)
 */
function Builder( parent, wrapperTag ) {
	this.blockTags = [];
	this.inlineAnnotationTags = [];
	this.doc = new Doc( wrapperTag || null );
	this.textChunks = [];
	this.parent = parent || null;
}

Builder.prototype.createChildBuilder = function ( wrapperTag ) {
	return new Builder( this, wrapperTag );
};

Builder.prototype.pushBlockTag = function ( tag ) {
	if ( this.inlineAnnotationTags.length > 0 ) {
		throw new Error(
			'Block tag <' + tag.name + '> inside inline tag <' +
			this.inlineAnnotationTags[ this.inlineAnnotationTags.length - 1 ].name + '>'
		);
	}
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
	var tag = this.inlineAnnotationTags.pop();
	if ( !tag || tag.name !== tagName ) {
		throw new Error(
			'Mismatched inline tags: open=' + ( tag && tag.name ) + ', close=' + tagName
		);
	}
	return tag;
};

Builder.prototype.addBlockSpace = function ( whitespace ) {
	this.doc.addItem( 'blockspace', whitespace );
};

Builder.prototype.addTextChunk = function ( text ) {
	this.textChunks.push( new TextChunk( text, this.inlineAnnotationTags.slice() ) );
};

Builder.prototype.addInlineEmptyTag = function ( tag ) {
	this.textChunks.push( new TextChunk( '', this.inlineAnnotationTags.slice(), tag ) );
};

Builder.prototype.addRefChunk = function ( ref ) {
	this.textChunks.push( new TextChunk( '', this.inlineAnnotationTags.slice(), ref ) );
};

Builder.prototype.finishTextBlock = function () {
	if ( this.textChunks.length > 0 ) {
		this.doc.addItem( 'textblock', new TextBlock( this.textChunks ) );
		this.textChunks = [];
	}
};

/**
 * Parser to read an HTML stream into a Doc
 * @class
 *
 * @constructor
 */
function Parser() {
	SAXParser.call( this, false, {
		lowercase: true
	} );
}
util.inherits( Parser, SAXParser );

Parser.prototype.init = function () {
	this.rootBuilder = new Builder();
	this.builder = this.rootBuilder;
};

Parser.prototype.onopentag = function ( tag ) {
	if ( isReference( tag ) ) {
		// Start a reference: create a child builder, and move into it
		this.builder = this.builder.createChildBuilder( tag );
	} else if ( isInlineEmptyTag( tag.name ) ) {
		this.builder.addInlineEmptyTag( tag );
	} else if ( isInlineAnnotationTag( tag.name ) ) {
		this.builder.pushInlineAnnotationTag( tag );
	} else {
		this.builder.pushBlockTag( tag );
	}
};

Parser.prototype.onclosetag = function ( tagName ) {
	if ( isInlineEmptyTag( tagName ) ) {
		return;
	} else if ( this.builder.inlineAnnotationTags.length > 0 ) {
		this.builder.popInlineAnnotationTag( tagName );
	} else if ( this.builder.blockTags.length > 0 ) {
		this.builder.popBlockTag( tagName );
	} else if ( this.builder.parent !== null ) {
		// In a sub document: should be a span that closes a reference
		if ( tagName !== 'span' ) {
			throw new Error( 'Expected close reference span, got "' + tagName + '"' );
		}
		this.builder.finishTextBlock();
		this.builder.parent.addRefChunk( this.builder.doc );
		// Finished with child now. Move back to the parent builder
		this.builder = this.builder.parent;
	} else {
		throw new Error( 'Unexpected close tag: ' + tagName );
	}
};

Parser.prototype.ontext = function ( text ) {
	if ( !text.trim() &&
		!this.builder.inlineAnnotationTags.length &&
		!this.builder.textChunks.length
	) {
		// Whitespace not after inline content.
		// TODO: treat whitespace before/after inline content consistently
		this.builder.addBlockSpace( text );
	} else {
		this.builder.addTextChunk( text );
	}
};

module.exports = {
	findAll: findAll,
	Doc: Doc,
	TextBlock: TextBlock,
	TextChunk: TextChunk,
	Builder: Builder,
	Parser: Parser
};
