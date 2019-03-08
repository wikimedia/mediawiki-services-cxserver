'use strict';

const TextChunk = require( './TextChunk.js' );
const Utils = require( './Utils.js' );
const cxUtils = require( './../util' );
/**
 * A block of annotated inline text
 *
 * @class
 */
class TextBlock {
	/**
	 * @constructor
	 *
	 * @param {string} textChunks Annotated inline text
	 * @param {boolean} canSegment This is a block which can be segmented
	 */
	constructor( textChunks, canSegment ) {
		this.textChunks = textChunks;
		this.canSegment = canSegment;
		this.offsets = [];
		let cursor = 0;
		for ( let i = 0, len = this.textChunks.length; i < len; i++ ) {
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
	getTagOffsets() {
		let textBlock = this,
			commonTags = this.getCommonTags();
		return this.offsets.filter( ( offset, i ) => {
			let textChunk = textBlock.textChunks[ i ];
			return textChunk.tags.length > commonTags.length && textChunk.text.length > 0;
		} );
	}

	/**
	 * Get the (last) text chunk at a given char offset
	 *
	 * @method
	 * @param {number} charOffset The char offset of the TextChunk
	 * @return {TextChunk} The text chunk
	 */
	getTextChunkAt( charOffset ) {
		let i, len;
		// TODO: bisecting instead of linear search
		for ( i = 0, len = this.textChunks.length - 1; i < len; i++ ) {
			if ( this.offsets[ i + 1 ].start > charOffset ) {
				break;
			}
		}
		return this.textChunks[ i ];
	}

	/**
	 * Returns the list of SAX tags that apply to the whole text block
	 *
	 * @return {Object[]} List of common SAX tags
	 */
	getCommonTags() {
		if ( this.textChunks.length === 0 ) {
			return [];
		}
		let commonTags = this.textChunks[ 0 ].tags.slice();
		for ( let i = 0, iLen = this.textChunks.length; i < iLen; i++ ) {
			let tags = this.textChunks[ i ].tags;
			if ( tags.length < commonTags.length ) {
				commonTags.splice( tags.length );
			}
			for ( let j = 0, jLen = commonTags.length; j < jLen; j++ ) {
				if ( commonTags[ j ].name !== tags[ j ].name ) {
					// truncate
					commonTags.splice( j );
					break;
				}
			}
		}
		return commonTags;
	}

	/**
	 * Create a new TextBlock, applying our annotations to a translation
	 *
	 * @method
	 * @param {string} targetText Translated plain text
	 * @param {Object[]} rangeMappings Array of source-target range index mappings
	 * @return {TextBlock} Translated textblock with tags applied
	 */
	translateTags( targetText, rangeMappings ) {
		// map of { offset: x, textChunks: [...] }
		let emptyTextChunks = {};
		let emptyTextChunkOffsets = [];
		// list of { start: x, length: x, textChunk: x }
		let textChunks = [];

		function pushEmptyTextChunks( offset, chunks ) {
			for ( let c = 0, cLen = chunks.length; c < cLen; c++ ) {
				textChunks.push( {
					start: offset,
					length: 0,
					textChunk: chunks[ c ]
				} );
			}
		}

		// Create map of empty text chunks, by offset
		for ( let i = 0, iLen = this.textChunks.length; i < iLen; i++ ) {
			let textChunk = this.textChunks[ i ];
			let offset = this.offsets[ i ].start;
			if ( textChunk.text.length > 0 ) {
				continue;
			}
			if ( !emptyTextChunks[ offset ] ) {
				emptyTextChunks[ offset ] = [];
			}
			emptyTextChunks[ offset ].push( textChunk );
		}
		for ( let offset in emptyTextChunks ) {
			emptyTextChunkOffsets.push( offset );
		}
		emptyTextChunkOffsets.sort( function ( a, b ) {
			return a - b;
		} );

		for ( let i = 0, iLen = rangeMappings.length; i < iLen; i++ ) {
			// Copy tags from source text start offset
			let rangeMapping = rangeMappings[ i ];
			let sourceRangeEnd = rangeMapping.source.start + rangeMapping.source.length;
			let targetRangeEnd = rangeMapping.target.start + rangeMapping.target.length;
			let sourceTextChunk = this.getTextChunkAt( rangeMapping.source.start );
			let text = targetText.substr( rangeMapping.target.start, rangeMapping.target.length );
			textChunks.push( {
				start: rangeMapping.target.start,
				length: rangeMapping.target.length,
				textChunk: new TextChunk(
					text, sourceTextChunk.tags, sourceTextChunk.inlineContent
				)
			} );

			// Empty source text chunks will not be represented in the target plaintext
			// (because they have no plaintext representation). Therefore we must clone each
			// one manually into the target rich text.

			// Iterate through all remaining emptyTextChunks
			for ( let j = 0; j < emptyTextChunkOffsets.length; j++ ) {
				let offset = emptyTextChunkOffsets[ j ];
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
		textChunks.sort( ( textChunk1, textChunk2 ) => textChunk1.start - textChunk2.start );
		// Fill in any textChunk gaps using text with commonTags
		let pos = 0;
		let commonTags = this.getCommonTags();
		for ( let i = 0, iLen = textChunks.length; i < iLen; i++ ) {
			let textChunk = textChunks[ i ];
			if ( textChunk.start < pos ) {
				throw new Error( 'Overlappping chunks at pos=' + pos + ', textChunks=' + i + ' start=' + textChunk.start );
			} else if ( textChunk.start > pos ) {
				// Unmapped chunk: insert plaintext and adjust offset
				textChunks.splice( i, 0, {
					start: pos,
					length: textChunk.start - pos,
					textChunk: new TextChunk(
						targetText.substr( pos, textChunk.start - pos ), commonTags
					)
				} );
				i++;
				iLen++;
			}
			pos = textChunk.start + textChunk.length;
		}

		// Get trailing text and trailing whitespace
		let tail = targetText.substr( pos );
		let tailSpace = tail.match( /\s*$/ )[ 0 ];
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
		for ( let i = 0, iLen = emptyTextChunkOffsets.length; i < iLen; i++ ) {
			let offset = emptyTextChunkOffsets[ i ];
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
	}

	/**
	 * Return plain text representation of the text block
	 *
	 * @return {string} Plain text representation
	 */
	getPlainText() {
		let text = [];
		for ( let i = 0, len = this.textChunks.length; i < len; i++ ) {
			text.push( this.textChunks[ i ].text );
		}
		return text.join( '' );
	}

	/**
     * Return HTML representation of the text block
     *
     * @return {string} Plain text representation
     */
	getHtml() {
		let html = [];
		// Start with no tags open
		let oldTags = [];
		for ( let i = 0, iLen = this.textChunks.length; i < iLen; i++ ) {
			let textChunk = this.textChunks[ i ];

			// Compare tag stacks; render close tags and open tags as necessary
			// Find the highest offset up to which the tags match on
			let matchTop = -1;
			let minLength = Math.min( oldTags.length, textChunk.tags.length );
			for ( let j = 0, jLen = minLength; j < jLen; j++ ) {
				if ( oldTags[ j ] === textChunk.tags[ j ] ) {
					matchTop = j;
				} else {
					break;
				}
			}
			for ( let j = oldTags.length - 1; j > matchTop; j-- ) {
				html.push( Utils.getCloseTagHtml( oldTags[ j ] ) );
			}
			for ( let j = matchTop + 1, jLen = textChunk.tags.length; j < jLen; j++ ) {
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
		for ( let j = oldTags.length - 1; j >= 0; j-- ) {
			html.push( Utils.getCloseTagHtml( oldTags[ j ] ) );
		}
		return html.join( '' );
	}

	/**
	 * Get a tag that can represent this textblock.
	 * Textblock can have multiple tags. The first tag is returned.
	 * If there is no tags, but inlineContent present, then that is returned.
	 * This is used to extract a unique identifier for the textblock at
	 * Doc#wrapSections.
	 * @return {Object}
	 */
	getTagForId() {
		for ( let i = 0, iLen = this.textChunks.length; i < iLen; i++ ) {
			let textChunk = this.textChunks[ i ];

			for ( let j = 0, jLen = textChunk.tags.length; j < jLen; j++ ) {
				if ( textChunk.tags[ j ] ) {
					return textChunk.tags[ j ];
				}
			}
			if ( textChunk.inlineContent ) {
				return textChunk.inlineContent;
			}
		}
		return null;
	}

	/**
	 * Segment the text block into sentences
	 *
	 * @method
	 * @param {Function} getBoundaries Function taking plaintext, returning offset array
	 * @param {Function} getNextId Function taking 'segment'|'link', returning next ID
	 * @return {TextBlock} Segmented version, with added span tags
	 */
	segment( getBoundaries, getNextId ) {
		// Setup: currentTextChunks for current segment, and allTextChunks for all segments
		let allTextChunks = [];
		let currentTextChunks = [];
		function flushChunks() {
			let modifiedTextChunks;
			if ( currentTextChunks.length === 0 ) {
				return;
			}
			modifiedTextChunks = Utils.addCommonTag( currentTextChunks, {
				name: 'span',
				attributes: {
					class: 'cx-segment',
					'data-segmentid': getNextId( 'segment' )
				}
			} );
			Utils.setLinkIdsInPlace( modifiedTextChunks, getNextId );
			allTextChunks.push.apply( allTextChunks, modifiedTextChunks );
			currentTextChunks = [];
		}

		// for each chunk, split at any boundaries that occur inside the chunk
		let groups = Utils.getChunkBoundaryGroups(
			getBoundaries( this.getPlainText() ),
			this.textChunks,
			( textChunk ) => textChunk.text.length
		);
		let offset = 0;
		for ( let i = 0, iLen = groups.length; i < iLen; i++ ) {
			let group = groups[ i ];
			let textChunk = group.chunk;
			let boundaries = group.boundaries;
			for ( let j = 0, jLen = boundaries.length; j < jLen; j++ ) {
				let relOffset = boundaries[ j ] - offset;
				if ( relOffset === 0 ) {
					flushChunks();
				} else {
					let leftPart = new TextChunk(
						textChunk.text.substring( 0, relOffset ), textChunk.tags.slice()
					);
					let rightPart = new TextChunk(
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
	}

	/**
	 * Set the link Ids for the links in all the textchunks in the textblock instance.
	 *
	 * @param {Function} getNextId Function taking 'segment'|'link', returning next ID
	 * @return {TextBlock} Segmented version, with added span tags
	 */
	setLinkIds( getNextId ) {
		Utils.setLinkIdsInPlace( this.textChunks, getNextId );
		return this;
	}

	/**
     * Adapt a text block.
     * @param {Function} getAdapter A function that returns an adapter for the given node item
     * @return {Promise} Promise that resolves the adapted TextBlock instance
     */
	adapt( getAdapter ) {
		let textChunkPromises = [];

		// Note that we are not using yield for the better readable code here. Yield will pause
		// the execution till the async call is resolved. For us, while looping over these text
		// chunks and tags, this will create a problem. Adaptations often perform asynchrounous API
		// calls to a MediaWiki instance. If we do API calls for each and every item like a link
		// title, it is inefficient. The API accepts a batched list of titles. We do have a batched
		// API mechanism in cxserver, but that works by debouncing the incoming requests with a
		// timeout. Pausing execution here will cause that debounce handler to be called.
		// So we avoid that pausing by just using an array of promises.
		this.textChunks.forEach( ( chunk ) => {
			let tagPromises = [],
				tags = chunk.tags;
			tags.forEach( ( tag ) => {
				const dataCX = cxUtils.getProp( [ 'attributes', 'data-cx' ], tag );
				if ( dataCX && Object.keys( JSON.parse( dataCX ) ).length ) {
					// Already adapted
					return;
				}
				let adapter = getAdapter( tag );
				if ( adapter && !Utils.isTransclusionFragment( tag ) ) {
					// This loop get executed for open and close for the tag.
					// Use data-cx to mark this tag processed. The actual adaptation
					// process below will update this value.
					tag.attributes[ 'data-cx' ] = JSON.stringify( { adapted: false } );
					tagPromises.push( adapter.adapt() );
				}
			} );
			textChunkPromises.push( Promise.all( tagPromises ) );
			let adaptPromise;
			if ( chunk.inlineContent ) {
				if ( chunk.inlineContent.adapt ) {
					// Inline content is a sub document.
					adaptPromise = chunk.inlineContent.adapt( getAdapter );
				} else {
					// Inline content is inline empty tag. Examples are link, meta etc.
					let adapter = getAdapter( chunk.inlineContent );
					if ( adapter && !Utils.isTransclusionFragment( chunk.inlineContent ) ) {
						adaptPromise = adapter.adapt();
					}
				}

				if ( adaptPromise ) {
					textChunkPromises.push( ( ( chunk ) => adaptPromise
						.then( ( adaptedInlineContent ) => {
							chunk.inlineContent = adaptedInlineContent;
						} ) )( chunk ) );
				}
			}
		} );

		return Promise.all( textChunkPromises ).then( () => this );
	}

	/**
	 * Dump an XML Array version of the linear representation, for debugging
	 *
	 * @method
	 * @param {string} pad Whitespace to indent XML elements
	 * @return {string[]} Array that will concatenate to an XML string representation
	 */
	dumpXmlArray( pad ) {
		let dump = [];
		for ( let i = 0, len = this.textChunks.length; i < len; i++ ) {
			let chunk = this.textChunks[ i ];
			let tagsDump = Utils.dumpTags( chunk.tags );
			let tagsAttr = tagsDump ? ' tags="' + tagsDump + '"' : '';
			if ( chunk.text ) {
				dump.push( pad + '<cxtextchunk' + tagsAttr + '>' +
					Utils.esc( chunk.text ).replace( /\n/g, '&#10;' ) +
					'</cxtextchunk>' );
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
	}
}

module.exports = TextBlock;
