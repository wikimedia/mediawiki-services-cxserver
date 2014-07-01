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
	var html, attributes, attr, i, len;
	html = [ '<' + esc( tag.name ) ];
	attributes = [];
	for ( attr in tag.attributes ) {
		attributes.push( attr );
	}
	attributes.sort();
	for ( i = 0, len = attributes.length; i < len; i++ ) {
		attr = attributes[i];
		html.push( ' ' + esc( attr ) + '="' + escAttr( tag.attributes[ attr ] ) + '"' );
	}
	if ( tag.isSelfClosing ) {
		html.push( ' /' );
	}
	html.push( '>' );
	return html.join( '' );
}

/**
 * Clone a SAX open tag
 * @private
 * @param {Object} tag Tag to clone
 * @return {Object} Cloned tag
 */
function cloneOpenTag( tag ) {
	var attr, newTag = { name: tag.name, attributes: {} };
	for ( attr in tag.attributes ) {
		newTag.attributes[attr] = tag.attributes[attr];
	}
	return newTag;
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
	if ( tag.name === 'span' && tag.attributes.typeof === 'mw:Extension/ref' ) {
		return true;
	} else if ( tag.name === 'span' && tag.attributes.class === 'reference' ) {
		// TODO: This is in the tests, but is it correct behaviour?
		return true;
	}
	return false;
}

/**
 * Determine whether a tag is an inline empty tag
 *
 * @private
 * @param {string} tagName The name of the tag (lowercase)
 * @returns {boolean} Whether the tag is an inline empty tag
 */
function isInlineEmptyTag( tagName ) {
	// link/meta as they're allowed anywhere in HTML5+RDFa, and must be treated as void
	// flow content. See http://www.w3.org/TR/rdfa-in-html/#extensions-to-the-html5-syntax
	return tagName === 'br' || tagName === 'img' || tagName === 'link' || tagName === 'meta';
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
] ) );

/**
 * Find the boundaries that lie in each chunk
 *
 * Boundaries lying between chunks lie in the latest chunk possible.
 * Boundaries at the start of the first chunk, or the end of the last, are not included.
 * Therefore zero-width chunks never have any boundaries
 *
 * @function
 * @param {number[]} boundaries Boundary offsets
 * @param chunks Chunks to which the boundaries apply
 * @param {Function} getLength Function returning the length of a chunk
 * @returns {Object} Array of {chunk: ch, boundaries: [...]}
 */
function getChunkBoundaryGroups( boundaries, chunks, getLength ) {
	var i, len, groupBoundaries, chunk, chunkLength, boundary,
		groups = [],
		offset = 0,
		boundaryPtr = 0;

	// Get boundaries in order, disregarding the start of the first chunk
	boundaries = boundaries.slice();
	boundaries.sort( function ( a, b ) { return a - b; } );
	while ( boundaries[boundaryPtr] === 0 ) {
		boundaryPtr++;
	}
	for ( i = 0, len = chunks.length; i < len; i++ ) {
		groupBoundaries = [];
		chunk = chunks[i];
		chunkLength = getLength( chunk );
		while ( true ) {
			boundary = boundaries[boundaryPtr];
			if ( boundary === undefined || boundary > offset + chunkLength - 1 ) {
				// beyond the interior of this chunk
				break;
			}
			// inside the interior of this chunk
			groupBoundaries.push( boundary );
			boundaryPtr++;
		}
		offset += chunkLength;
		groups.push( {
			chunk: chunk,
			boundaries: groupBoundaries
		} );
		// Continue even if past boundaries: need to add remaining chunks
	}
	return groups;
}

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
	var i, len, cursor;
	this.textChunks = textChunks;
	this.startOffsets = [];
	cursor = 0;
	for ( i = 0, len = this.textChunks.length; i < len; i++ ) {
		this.startOffsets[i] = cursor;
		cursor += this.textChunks[i].text.length;
	}
}

/**
 * Get the (last) text chunk at a given char offset
 * @method
 * @param {number} charOffset the char offset of the TextChunk
 * @return {TextChunk} The text chunk
 */
TextBlock.prototype.getTextChunkAt = function ( charOffset ) {
	// TODO: bisecting instead of quadratic
	var i, len;
	for ( i = 0, len = this.textChunks.length - 1; i < len; i++ ) {
		if ( this.startOffsets[i + 1] > charOffset ) {
			break;
		}
	}
	return this.textChunks[ i ];
};

/**
 * Create a new TextBlock, applying our annotations to a translation
 *
 * @method
 * @param {string} targetText Translated plain text
 * @param {Object[]} rangeMappings Array of source-target range index mappings
 * @returns {TextBlock} Translated textblock with annotations applied
 */
TextBlock.prototype.translateAnnotations = function ( targetText, rangeMappings ) {
	var i, len, rangeMapping, oldTextChunk, newText,
		newTextChunks = [];
	for ( i = 0, len = rangeMappings.length; i < len; i++ ) {
		rangeMapping = rangeMappings[i];
		oldTextChunk = this.getTextChunkAt( rangeMapping.source.start );
		newText = targetText.substr(
			rangeMapping.target.start,
			rangeMapping.target.length
		);
		newTextChunks.push( new TextChunk(
			newText,
			oldTextChunk.tags,
			oldTextChunk.inlineElement
		) );
	}
	return new TextBlock( newTextChunks );
};

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
		html.push( esc( textChunk.text ) );
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
 * Set link IDs in-place on text chunks
 *
 * @private
 * @param {TextChunk[]} textChunks Consecutive text chunks
 * @param {Function} getNextId function accepting 'link' and returning next ID
 */
function setLinkIdsInPlace( textChunks, getNextId ) {
	var i, iLen, j, jLen, tags, tag, href;
	for ( i = 0, iLen = textChunks.length; i < iLen; i++ ) {
		tags = textChunks[ i ].tags;
		for ( j = 0, jLen = tags.length; j < jLen; j++ ) {
			tag = tags[ j ];
			if (
				tag.name === 'a' &&
				tag.attributes.href !== undefined &&
				tag.attributes[ 'data-linkid' ] === undefined
			) {
				// Hack: copy href, then remove it, then re-add it, so that
				// attributes appear in alphabetical order (ugh)
				href = tag.attributes.href;
				delete tag.attributes.href;
				tag.attributes.class = 'cx-link';
				tag.attributes[ 'data-linkid' ] = getNextId( 'link' );
				tag.attributes.href = href;
			}
		}
	}
}

/**
 * Segment the text block into sentences
 * @method
 * @param {Function} getBoundaries Function taking plaintext, returning offset array
 * @param {Function} getNextId Function taking 'segment'|'link', returning next ID
 * @return {TextBlock} Segmented version, with added span tags
 */
TextBlock.prototype.segment = function ( getBoundaries, getNextId ) {
	var allTextChunks, currentTextChunks, groups, i, iLen, group, offset, textChunk, j, jLen,
		leftPart, rightPart, boundaries, relOffset;

	// Setup: currentTextChunks for current segment, and allTextChunks for all segments
	allTextChunks = [];
	currentTextChunks = [];
	function flushChunks() {
		var modifiedTextChunks;
		if ( currentTextChunks.length === 0 ) {
			return;
		}
		modifiedTextChunks = addCommonTag(
			currentTextChunks,
			{
				name: 'span',
				attributes: {
					class: 'cx-segment',
					'data-segmentid': getNextId( 'segment' )
				}
			}
		);
		setLinkIdsInPlace( modifiedTextChunks, getNextId );
		allTextChunks.push.apply( allTextChunks, modifiedTextChunks );
		currentTextChunks = [];
	}

	// for each chunk, split at any boundaries that occur inside the chunk
	groups = getChunkBoundaryGroups(
		getBoundaries( this.getPlainText() ),
		this.textChunks,
		function ( textChunk ) { return textChunk.text.length; }
	);

	offset = 0;
	for ( i = 0, iLen = groups.length; i < iLen; i++ ) {
		group = groups[i];
		textChunk = group.chunk;
		boundaries = group.boundaries;
		for ( j = 0, jLen = boundaries.length; j < jLen; j++ ) {
			relOffset = boundaries[j] - offset;
			if ( relOffset === 0 ) {
				flushChunks();
			} else {
				leftPart = new TextChunk(
					textChunk.text.substring( 0, relOffset ),
					textChunk.tags.slice()
				);
				rightPart = new TextChunk(
					textChunk.text.substring( relOffset ),
					textChunk.tags.slice(),
					textChunk.inlineElement
				);
				currentTextChunks.push( leftPart );
				offset += relOffset;
				flushChunks();
				textChunk = rightPart;
			}
		}
		// Even if the textChunk is zero-width, it may have references
		currentTextChunks.push( textChunk );
		offset += textChunk.text.length;
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
 * Clone the Doc, modifying as we go
 *
 * @method
 * @param callback The function to modify a node
 * @return {Doc} clone with modifications
 */
Doc.prototype.clone = function ( callback ) {
	var i, len, item, newItem,
		newDoc = new Doc( this.wrapperTag );
	for ( i = 0, len = this.items.length; i < len; i++ ) {
		item = this.items[ i ];
		newItem = callback( item );
		newDoc.addItem( newItem.type, newItem.item );
	}
	return newDoc;
};

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
	var i, len, item, tag, textBlock,
		newDoc = new Doc(),
		nextId = 0;

	// TODO: return different counters depending on type
	function getNextId( type ) {
		if ( type === 'segment' || type === 'link' || type === 'block' ) {
			return '' + nextId++;
		} else {
			throw new Error( 'Unknown ID type: ' + type );
		}
	}

	for ( i = 0, len = this.items.length; i < len; i++ ) {
		item = this.items[ i ];
		if ( this.items[ i ].type === 'open' ) {
			tag = cloneOpenTag( item.item );
			tag.attributes.id = getNextId( 'block' );
			newDoc.addItem( item.type, tag );
		} else if ( this.items[ i ].type !== 'textblock' ) {
			newDoc.addItem( item.type, item.item );
		} else {
			textBlock = item.item;
			newDoc.addItem(
				'textblock',
				textBlock.segment( getBoundaries, getNextId )
			);
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
			console.error( 'Unknown item type at ' + i );
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

/**
 * Parser to normalize XML
 * @class
 * @constructor
 */
function Normalizer() {
	SAXParser.call( this, false, { lowercase: true } );
}
util.inherits( Normalizer, SAXParser );

Normalizer.prototype.init = function () {
	this.doc = [];
	this.tags = [];
};

Normalizer.prototype.onopentag = function ( tag ) {
	this.tags.push( tag );
	this.doc.push( getOpenTagHtml( tag ) );
};

Normalizer.prototype.onclosetag = function ( tagName ) {
	var tag = this.tags.pop();
	if ( tag.name !== tagName ) {
		throw new Error( 'Unmatched tags: ' + tag.name + ' !== ' + tagName );
	}
	this.doc.push( getCloseTagHtml( tag ) );
};

Normalizer.prototype.ontext = function ( text ) {
	this.doc.push( esc( text ) );
};

Normalizer.prototype.getHtml = function () {
	return this.doc.join( '' );
};

module.exports = {
	esc: esc,
	findAll: findAll,
	Doc: Doc,
	TextBlock: TextBlock,
	TextChunk: TextChunk,
	Builder: Builder,
	Parser: Parser,
	Normalizer: Normalizer
};
