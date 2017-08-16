'use strict';

var TextChunk = require( './TextChunk.js' ),
	Utils = require( './Utils.js' );

/**
 * A block of annotated inline text
 *
 * @class
 *
 * @constructor
 *
 * @param {string} textChunks annotated inline text
 */
function TextBlock( textChunks ) {
	var i, len, cursor;
	this.textChunks = textChunks;
	this.offsets = [];
	cursor = 0;
	for ( i = 0, len = this.textChunks.length; i < len; i++ ) {
		this.offsets[ i ] = {
			start: cursor,
			length: this.textChunks[ i ].text.length,
			tags: this.textChunks[ i ].tags
		};
		cursor += this.offsets[ i ].length;
	}
}

/**
 * Get the start and length of each non-common annotation
 *
 * @return {Object[]}
 * @return {number} [i].start {number} Position of each text chunk
 * @return {number} [i].length {number} Length of each text chunk
 */
TextBlock.prototype.getTagOffsets = function () {
	var textBlock = this,
		commonTags = this.getCommonTags();
	return this.offsets.filter( function ( offset, i ) {
		var textChunk = textBlock.textChunks[ i ];
		return textChunk.tags.length > commonTags.length && textChunk.text.length > 0;
	} );
};

/**
 * Get the (last) text chunk at a given char offset
 *
 * @method
 * @param {number} charOffset The char offset of the TextChunk
 * @return {TextChunk} The text chunk
 */
TextBlock.prototype.getTextChunkAt = function ( charOffset ) {
	// TODO: bisecting instead of linear search
	var i, len;
	for ( i = 0, len = this.textChunks.length - 1; i < len; i++ ) {
		if ( this.offsets[ i + 1 ].start > charOffset ) {
			break;
		}
	}
	return this.textChunks[ i ];
};

/**
 * Returns the list of SAX tags that apply to the whole text block
 *
 * @return {Object[]} List of common SAX tags
 */
TextBlock.prototype.getCommonTags = function () {
	var i, iLen, j, jLen, commonTags, tags;
	if ( this.textChunks.length === 0 ) {
		return [];
	}
	commonTags = this.textChunks[ 0 ].tags.slice();
	for ( i = 0, iLen = this.textChunks.length; i < iLen; i++ ) {
		tags = this.textChunks[ i ].tags;
		if ( tags.length < commonTags.length ) {
			commonTags.splice( tags.length );
		}
		for ( j = 0, jLen = commonTags.length; j < jLen; j++ ) {
			if ( commonTags[ j ].name !== tags[ j ].name ) {
				// truncate
				commonTags.splice( j );
				break;
			}
		}
	}
	return commonTags;
};

/**
 * Create a new TextBlock, applying our annotations to a translation
 *
 * @method
 * @param {string} targetText Translated plain text
 * @param {Object[]} rangeMappings Array of source-target range index mappings
 * @return {TextBlock} Translated textblock with tags applied
 */
TextBlock.prototype.translateTags = function ( targetText, rangeMappings ) {
	var i, iLen, j, rangeMapping, sourceTextChunk, text, pos, textChunk, offset,
		sourceRangeEnd, targetRangeEnd, tail, tailSpace, commonTags,
		// map of { offset: x, textChunks: [...] }
		emptyTextChunks = {},
		emptyTextChunkOffsets = [],
		// list of { start: x, length: x, textChunk: x }
		textChunks = [];

	function pushEmptyTextChunks( offset, chunks ) {
		var c, cLen;
		for ( c = 0, cLen = chunks.length; c < cLen; c++ ) {
			textChunks.push( {
				start: offset,
				length: 0,
				textChunk: chunks[ c ]
			} );
		}
	}

	// Create map of empty text chunks, by offset
	for ( i = 0, iLen = this.textChunks.length; i < iLen; i++ ) {
		textChunk = this.textChunks[ i ];
		offset = this.offsets[ i ].start;
		if ( textChunk.text.length > 0 ) {
			continue;
		}
		if ( !emptyTextChunks[ offset ] ) {
			emptyTextChunks[ offset ] = [];
		}
		emptyTextChunks[ offset ].push( textChunk );
	}
	for ( offset in emptyTextChunks ) {
		emptyTextChunkOffsets.push( offset );
	}
	emptyTextChunkOffsets.sort( function ( a, b ) {
		return a - b;
	} );

	for ( i = 0, iLen = rangeMappings.length; i < iLen; i++ ) {
		// Copy tags from source text start offset
		rangeMapping = rangeMappings[ i ];
		sourceRangeEnd = rangeMapping.source.start + rangeMapping.source.length;
		targetRangeEnd = rangeMapping.target.start + rangeMapping.target.length;
		sourceTextChunk = this.getTextChunkAt( rangeMapping.source.start );
		text = targetText.substr( rangeMapping.target.start, rangeMapping.target.length );
		textChunks.push( {
			start: rangeMapping.target.start,
			length: rangeMapping.target.length,
			textChunk: new TextChunk(
				text,
				sourceTextChunk.tags,
				sourceTextChunk.inlineContent
			)
		} );

		// Empty source text chunks will not be represented in the target plaintext
		// (because they have no plaintext representation). Therefore we must clone each
		// one manually into the target rich text.

		// Iterate through all remaining emptyTextChunks
		for ( j = 0; j < emptyTextChunkOffsets.length; j++ ) {
			offset = emptyTextChunkOffsets[ j ];
			// Check whether chunk is in range
			if ( offset < rangeMapping.source.start || offset > sourceRangeEnd ) {
				continue;
			}
			// Push chunk into target text at the current point
			pushEmptyTextChunks( targetRangeEnd, emptyTextChunks[ offset ] );
			// Remove chunk from remaining list
			delete emptyTextChunks[ offset ];
			emptyTextChunkOffsets.splice( j, 1 );
			// Decrement pointer to match removal
			j--;
		}
	}
	// Sort by start position
	textChunks.sort( function ( textChunk1, textChunk2 ) {
		return textChunk1.start - textChunk2.start;
	} );
	// Fill in any textChunk gaps using text with commonTags
	pos = 0;
	commonTags = this.getCommonTags();
	for ( i = 0, iLen = textChunks.length; i < iLen; i++ ) {
		textChunk = textChunks[ i ];
		if ( textChunk.start < pos ) {
			throw new Error( 'Overlappping chunks at pos=' + pos + ', textChunks=' + i + ' start=' + textChunk.start );
		} else if ( textChunk.start > pos ) {
			// Unmapped chunk: insert plaintext and adjust offset
			textChunks.splice( i, 0, {
				start: pos,
				length: textChunk.start - pos,
				textChunk: new TextChunk(
					targetText.substr( pos, textChunk.start - pos ),
					commonTags
				)
			} );
			i++;
			iLen++;
		}
		pos = textChunk.start + textChunk.length;
	}

	// Get trailing text and trailing whitespace
	tail = targetText.substr( pos );
	tailSpace = tail.match( /\s*$/ )[ 0 ];
	if ( tailSpace ) {
		tail = tail.substr( 0, tail.length - tailSpace.length );
	}

	if ( tail ) {
		// Append tail as text with commonTags
		textChunks.push( {
			start: pos,
			length: tail.length,
			textChunk: new TextChunk( tail, commonTags )
		} );
		pos += tail.length;
	}

	// Copy any remaining textChunks that have no text
	for ( i = 0, iLen = emptyTextChunkOffsets.length; i < iLen; i++ ) {
		offset = emptyTextChunkOffsets[ i ];
		pushEmptyTextChunks( pos, emptyTextChunks[ offset ] );
	}
	if ( tailSpace ) {
		// Append tailSpace as text with commonTags
		textChunks.push( {
			start: pos,
			length: tailSpace.length,
			textChunk: new TextChunk( tailSpace, commonTags )
		} );
		pos += tail.length;
	}
	return new TextBlock( textChunks.map( function ( x ) {
		return x.textChunk;
	} ) );
};

/**
 * Return plain text representation of the text block
 *
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
 *
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
			html.push( Utils.getCloseTagHtml( oldTags[ j ] ) );
		}
		for ( j = matchTop + 1, jLen = textChunk.tags.length; j < jLen; j++ ) {
			html.push( Utils.getOpenTagHtml( textChunk.tags[ j ] ) );
		}
		oldTags = textChunk.tags;

		// Now add text and inline content
		html.push( Utils.esc( textChunk.text ) );
		if ( textChunk.inlineContent ) {
			if ( textChunk.inlineContent.getHtml ) {
				// a sub-doc
				html.push( textChunk.inlineContent.getHtml() );
			} else {
				// an empty inline tag
				html.push( Utils.getOpenTagHtml( textChunk.inlineContent ) );
				html.push( Utils.getCloseTagHtml( textChunk.inlineContent ) );
			}
		}
	}
	// Finally, close any remaining tags
	for ( j = oldTags.length - 1; j >= 0; j-- ) {
		html.push( Utils.getCloseTagHtml( oldTags[ j ] ) );
	}
	return html.join( '' );
};

/**
 * Segment the text block into sentences
 *
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
		modifiedTextChunks = Utils.addCommonTag(
			currentTextChunks, {
				name: 'span',
				attributes: {
					'class': 'cx-segment',
					'data-segmentid': getNextId( 'segment' )
				}
			}
		);
		Utils.setLinkIdsInPlace( modifiedTextChunks, getNextId );
		allTextChunks.push.apply( allTextChunks, modifiedTextChunks );
		currentTextChunks = [];
	}

	// for each chunk, split at any boundaries that occur inside the chunk
	groups = Utils.getChunkBoundaryGroups(
		getBoundaries( this.getPlainText() ),
		this.textChunks,
		function ( textChunk ) {
			return textChunk.text.length;
		}
	);

	offset = 0;
	for ( i = 0, iLen = groups.length; i < iLen; i++ ) {
		group = groups[ i ];
		textChunk = group.chunk;
		boundaries = group.boundaries;
		for ( j = 0, jLen = boundaries.length; j < jLen; j++ ) {
			relOffset = boundaries[ j ] - offset;
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
					textChunk.inlineContent
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
 * Adapt a text block.
 * @param {Function} getAdapter A function that returns an adapter for the given node item
 * @return {Promise} Promise that resolves the adapted TextBlock instance
 */
TextBlock.prototype.adapt = function ( getAdapter ) {
	var textChunkPromises = [];

	// Note that we are not using yield for the better readable code here. Yield will pause
	// the execution till the async call is resolved. For us, while looping over these text
	// chunks and tags, this will create a problem. Adaptations often perform asynchrounous API
	// calls to a MediaWiki instance. If we do API calls for each and every item like a link
	// title, it is inefficient. The API accepts a batched list of titles. We do have a batched
	// API mechanism in cxserver, but that works by debouncing the incoming requests with a
	// timeout. Pausing execution here will cause that debounce handler to be called.
	// So we avoid that pausing by just using an array of promises.
	this.textChunks.forEach( ( chunk ) => {
		var tagPromises = [],
			tags = chunk.tags;

		tags.forEach( ( tag ) => {
			const adapter = getAdapter( tag );
			if ( adapter ) {
				tagPromises.push( adapter.adapt() );
			}
		} );

		textChunkPromises.push( Promise.all( tagPromises ) );

		if ( chunk.inlineContent && chunk.inlineContent.adapt ) {
			textChunkPromises.push( ( ( chunk ) => chunk.inlineContent.adapt( getAdapter )
				.then( ( adaptedInlineContent ) => {
					chunk.inlineContent = adaptedInlineContent;
				} ) )( chunk )
			);
		}
	} );

	return Promise.all( textChunkPromises ).then( () => this );
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
		tagsDump = Utils.dumpTags( chunk.tags );
		tagsAttr = tagsDump ? ' tags="' + tagsDump + '"' : '';
		if ( chunk.text ) {
			dump.push(
				pad + '<cxtextchunk' + tagsAttr + '>' +
				Utils.esc( chunk.text ).replace( /\n/g, '&#10;' ) +
				'</cxtextchunk>'
			);
		}
		if ( chunk.inlineContent ) {
			dump.push( pad + '<cxinlineelement' + tagsAttr + '>' );
			if ( chunk.inlineContent.dumpXmlArray ) {
				// sub-doc: concatenate
				dump.push.apply( dump, chunk.inlineContent.dumpXmlArray( pad + '  ' ) );
			} else {
				dump.push( pad + '  <' + chunk.inlineContent.name + '/>' );
			}
			dump.push( pad + '</cxinlineelement>' );
		}
	}
	return dump;
};

module.exports = TextBlock;
