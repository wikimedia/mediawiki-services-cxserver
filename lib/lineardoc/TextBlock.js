import TextChunk from './TextChunk.js';
import { addCommonTag, dumpTags, esc, getChunkBoundaryGroups, getCloseTagHtml, getOpenTagHtml, isReference, isTransclusion, isTransclusionFragment, setLinkIdsInPlace } from './Utils.js';
import { getProp } from './../util.js';

/**
 * Whether the text chunk represents a reference marker.
 *
 * @param {TextChunk} chunk
 * @return {boolean}
 */
function isReferenceChunk( chunk ) {
	const inline = chunk.inlineContent;
	if ( inline && inline.wrapperTag && inline.wrapperTag.attributes &&
		isReference( inline.wrapperTag ) ) {
		return true;
	}
	return chunk.tags.some( ( tag ) => tag.attributes && isReference( tag ) );
}

// Placeholder characters used when a text block is flattened to a plain
// string. These are Unicode noncharacters (U+FDD0 and U+FDD1), guaranteed
// absent from interchanged text.
const REF_CHAR = '\uFDD0';
const INLINE_CHAR = '\uFDD1';

/**
 * Flatten chunks into one item per string position. Reference markers and
 * other inline content become a single placeholder item; text chunks
 * contribute one item per code unit, each remembering its source chunk.
 * The concatenated chars form the plain text of the block, so rules matched
 * against it do not depend on how the text is split into chunks.
 *
 * @param {TextChunk[]} chunks
 * @return {Object[]} Items of shape { char, chunk, atomic }
 */
function toCharItems( chunks ) {
	const items = [];
	for ( const chunk of chunks ) {
		if ( isReferenceChunk( chunk ) ) {
			items.push( { char: REF_CHAR, chunk, atomic: true } );
		} else if ( chunk.inlineContent ) {
			items.push( { char: INLINE_CHAR, chunk, atomic: true } );
		} else {
			for ( let i = 0; i < chunk.text.length; i++ ) {
				items.push( { char: chunk.text[ i ], chunk } );
			}
		}
	}
	return items;
}

/**
 * Rebuild a chunk list from (reordered) flattened items. Atomic items emit
 * their original chunk; consecutive characters from the same source chunk
 * merge back into a single chunk. Source tags arrays are reused by
 * reference, which keeps the serialized markup of untouched regions
 * byte-identical.
 *
 * @param {Object[]} items Items produced by toCharItems
 * @return {TextChunk[]} New chunk list
 */
function toChunks( items ) {
	const chunks = [];
	let text = '';
	let source = null;
	const flush = () => {
		if ( text !== '' ) {
			chunks.push( new TextChunk( text, source.tags ) );
			text = '';
		}
	};
	for ( const item of items ) {
		if ( item.atomic ) {
			flush();
			source = null;
			chunks.push( item.chunk );
		} else if ( item.chunk === source ) {
			text += item.char;
		} else {
			flush();
			source = item.chunk;
			text = item.char;
		}
	}
	flush();
	return chunks;
}

/**
 * Escape a character for use inside a regex character class.
 *
 * @param {string} char
 * @return {string}
 */
function escapeForCharClass( char ) {
	return char.replace( /[\\\]^-]/g, '\\$&' );
}

/**
 * Move sentence punctuation across reference runs to the side preferred by
 * the target language. The block is flattened to a plain string in which
 * every reference marker is a single placeholder character, so the rule is
 * one regex over the visible text, independent of chunk boundaries. The
 * whitespace that separated the word, punctuation and references is dropped
 * so that the three stay glued together; whitespace between the references
 * of a run is preserved.
 *
 * @param {TextChunk[]} chunks
 * @param {string} policy 'before' or 'after'
 * @param {string[]} punctuation Punctuation marks to reposition around
 * @return {TextChunk[]} New chunk list
 */
function movePunctuationAcrossReferences( chunks, policy, punctuation ) {
	const items = toCharItems( chunks );
	const text = items.map( ( item ) => item.char ).join( '' );
	const punct = '([' + punctuation.map( escapeForCharClass ).join( '' ) + '])';
	const run = `(${ REF_CHAR }(?:\\s*${ REF_CHAR })*)`;
	const pattern = policy === 'before' ?
		new RegExp( `${ punct }\\s*${ run }`, 'gd' ) :
		new RegExp( `\\s*${ run }\\s*${ punct }`, 'gd' );

	const reordered = [];
	let position = 0;
	for ( const match of text.matchAll( pattern ) ) {
		const [ runStart, runEnd ] = match.indices[ policy === 'before' ? 2 : 1 ];
		const runItems = items.slice( runStart, runEnd );
		// The moved punctuation inherits the reference tags (e.g. the segment
		// span) so it stays inside the same markup as the reference run.
		const punctItem = {
			char: match[ policy === 'before' ? 1 : 2 ],
			chunk: { tags: runItems[ runItems.length - 1 ].chunk.tags }
		};
		reordered.push( ...items.slice( position, match.index ) );
		if ( policy === 'before' ) {
			reordered.push( ...runItems, punctItem );
		} else {
			reordered.push( punctItem, ...runItems );
		}
		position = match.index + match[ 0 ].length;
	}
	reordered.push( ...items.slice( position ) );
	return toChunks( reordered );
}

/**
 * A block of annotated inline text
 *
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
	 * @return {Object[]} Array of text chunk information objects with start and length properties
	 */
	getTagOffsets() {
		const textBlock = this,
			commonTags = this.getCommonTags();
		return this.offsets.filter( ( offset, i ) => {
			const textChunk = textBlock.textChunks[ i ];
			return textChunk.tags.length > commonTags.length && textChunk.text.length > 0;
		} );
	}

	/**
	 * Get the (last) text chunk at a given char offset
	 *
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
		const commonTags = this.textChunks[ 0 ].tags.slice();
		for ( let i = 0, iLen = this.textChunks.length; i < iLen; i++ ) {
			const tags = this.textChunks[ i ].tags;
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
	 * @param {string} targetText Translated plain text
	 * @param {Object[]} rangeMappings Array of source-target range index mappings
	 * @return {TextBlock} Translated textblock with tags applied
	 */
	translateTags( targetText, rangeMappings ) {
		// map of { offset: x, textChunks: [...] }
		const emptyTextChunks = {};
		const emptyTextChunkOffsets = [];
		// list of { start: x, length: x, textChunk: x }
		const textChunks = [];

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
			const textChunk = this.textChunks[ i ];
			const offset = this.offsets[ i ].start;
			if ( textChunk.text.length > 0 ) {
				continue;
			}
			if ( !emptyTextChunks[ offset ] ) {
				emptyTextChunks[ offset ] = [];
			}
			emptyTextChunks[ offset ].push( textChunk );
		}
		for ( const offset in emptyTextChunks ) {
			emptyTextChunkOffsets.push( offset );
		}
		emptyTextChunkOffsets.sort( ( a, b ) => a - b );

		for ( let i = 0, iLen = rangeMappings.length; i < iLen; i++ ) {
			// Copy tags from source text start offset
			const rangeMapping = rangeMappings[ i ];
			const sourceRangeEnd = rangeMapping.source.start + rangeMapping.source.length;
			const targetRangeEnd = rangeMapping.target.start + rangeMapping.target.length;
			const sourceTextChunk = this.getTextChunkAt( rangeMapping.source.start );
			const text = targetText.slice( rangeMapping.target.start, rangeMapping.target.start + rangeMapping.target.length );
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
				const offset = emptyTextChunkOffsets[ j ];
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
		const commonTags = this.getCommonTags();
		for ( let i = 0, iLen = textChunks.length; i < iLen; i++ ) {
			const textChunk = textChunks[ i ];
			if ( textChunk.start < pos ) {
				throw new Error( 'Overlappping chunks at pos=' + pos + ', textChunks=' + i + ' start=' + textChunk.start );
			} else if ( textChunk.start > pos ) {
				// Unmapped chunk: insert plaintext and adjust offset
				textChunks.splice( i, 0, {
					start: pos,
					length: textChunk.start - pos,
					textChunk: new TextChunk(
						targetText.slice( pos, textChunk.start ), commonTags
					)
				} );
				i++;
				iLen++;
			}
			pos = textChunk.start + textChunk.length;
		}

		// Get trailing text and trailing whitespace
		let tail = targetText.slice( pos );
		const tailSpace = tail.match( /\s*$/ )[ 0 ];
		if ( tailSpace ) {
			tail = tail.slice( 0, tail.length - tailSpace.length );
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
			const offset = emptyTextChunkOffsets[ i ];
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
		return new TextBlock( textChunks.map( ( x ) => x.textChunk ) );
	}

	/**
	 * Return plain text representation of the text block
	 *
	 * @return {string} Plain text representation
	 */
	getPlainText() {
		const text = [];
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
		const html = [];
		// Start with no tags open
		let oldTags = [];
		for ( let i = 0, iLen = this.textChunks.length; i < iLen; i++ ) {
			const textChunk = this.textChunks[ i ];

			// Compare tag stacks; render close tags and open tags as necessary
			// Find the highest offset up to which the tags match on
			let matchTop = -1;
			const minLength = Math.min( oldTags.length, textChunk.tags.length );
			for ( let j = 0, jLen = minLength; j < jLen; j++ ) {
				if ( oldTags[ j ] === textChunk.tags[ j ] ) {
					matchTop = j;
				} else {
					break;
				}
			}
			for ( let j = oldTags.length - 1; j > matchTop; j-- ) {
				html.push( getCloseTagHtml( oldTags[ j ] ) );
			}
			for ( let j = matchTop + 1, jLen = textChunk.tags.length; j < jLen; j++ ) {
				html.push( getOpenTagHtml( textChunk.tags[ j ] ) );
			}
			oldTags = textChunk.tags;

			// Now add text and inline content
			html.push( esc( textChunk.text ) );
			if ( textChunk.inlineContent ) {
				if ( textChunk.inlineContent.getHtml ) {
					// a sub-doc
					html.push( textChunk.inlineContent.getHtml() );
				} else {
					// an empty inline tag
					html.push( getOpenTagHtml( textChunk.inlineContent ) );
					html.push( getCloseTagHtml( textChunk.inlineContent ) );
				}
			}
		}
		// Finally, close any remaining tags
		for ( let j = oldTags.length - 1; j >= 0; j-- ) {
			html.push( getCloseTagHtml( oldTags[ j ] ) );
		}
		return html.join( '' );
	}

	/**
	 * Get a root item in the textblock
	 *
	 * @return {Object}
	 */
	getRootItem() {
		for ( let i = 0, iLen = this.textChunks.length; i < iLen; i++ ) {
			const textChunk = this.textChunks[ i ];

			if ( textChunk.tags.length === 0 && textChunk.text && textChunk.text.match( /[^\s]/ ) ) {
				// No tags in this textchunk. See if there is non whitespace text
				return null;
			}

			for ( let j = 0, jLen = textChunk.tags.length; j < jLen; j++ ) {
				if ( textChunk.tags[ j ] ) {
					return textChunk.tags[ j ];
				}
			}
			if ( textChunk.inlineContent ) {
				const inlineDoc = textChunk.inlineContent;
				// Presence of inlineDoc.getRootItem confirms that inlineDoc is a Doc instance.
				if ( inlineDoc && inlineDoc.getRootItem ) {
					const rootItem = inlineDoc.getRootItem();
					return rootItem || null;
				} else {
					return inlineDoc;
				}
			}
		}
		return null;
	}

	/**
	 * Get a tag that can represent this textblock.
	 * Textblock can have multiple tags. The first tag is returned.
	 * If there is no tags, but inlineContent present, then that is returned.
	 * This is used to extract a unique identifier for the textblock at
	 * Doc#wrapSections.
	 *
	 * @return {Object}
	 */
	getTagForId() {
		return this.getRootItem();
	}

	/**
	 * Segment the text block into sentences
	 *
	 * @param {Function} getBoundaries Function taking plaintext, returning offset array
	 * @param {Function} getNextId Function taking 'segment'|'link', returning next ID
	 * @return {TextBlock} Segmented version, with added span tags
	 */
	segment( getBoundaries, getNextId ) {
		// Setup: currentTextChunks for current segment, and allTextChunks for all segments
		const allTextChunks = [];
		let currentTextChunks = [];
		function flushChunks() {
			if ( currentTextChunks.length === 0 ) {
				return;
			}
			const modifiedTextChunks = addCommonTag( currentTextChunks, {
				name: 'span',
				attributes: {
					class: 'cx-segment',
					'data-segmentid': getNextId( 'segment' )
				}
			} );
			setLinkIdsInPlace( modifiedTextChunks, getNextId );
			allTextChunks.push.apply( allTextChunks, modifiedTextChunks );
			currentTextChunks = [];
		}

		const rootItem = this.getRootItem();
		if ( rootItem && isTransclusion( rootItem ) ) {
			// Avoid segmenting inside transclusions.
			return this;
		}

		// for each chunk, split at any boundaries that occur inside the chunk
		const groups = getChunkBoundaryGroups(
			getBoundaries( this.getPlainText() ),
			this.textChunks,
			( textChunk ) => textChunk.text.length
		);
		let offset = 0;
		for ( let i = 0, iLen = groups.length; i < iLen; i++ ) {
			const group = groups[ i ];
			let textChunk = group.chunk;
			const boundaries = group.boundaries;
			for ( let j = 0, jLen = boundaries.length; j < jLen; j++ ) {
				const relOffset = boundaries[ j ] - offset;
				if ( relOffset === 0 ) {
					flushChunks();
				} else {
					const leftPart = new TextChunk(
						textChunk.text.slice( 0, relOffset ), textChunk.tags.slice()
					);
					const rightPart = new TextChunk(
						textChunk.text.slice( relOffset ),
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
		setLinkIdsInPlace( this.textChunks, getNextId );
		return this;
	}

	/**
	 * Adapt a text block.
	 *
	 * @param {Function} getAdapter A function that returns an adapter for the given node item
	 * @return {Promise} Promise that resolves the adapted TextBlock instance
	 */
	adapt( getAdapter ) {
		const textChunkPromises = [];

		// Note that we are not using `await` for the better readable code here. `await` will pause
		// the execution till the `async` call is resolved. For us, while looping over these text
		// chunks and tags, this will create a problem. Adaptations often perform asynchrounous API
		// calls to a MediaWiki instance. If we do API calls for each and every item like a link
		// title, it is inefficient. The API accepts a batched list of titles. We do have a batched
		// API mechanism in cxserver, but that works by debouncing the incoming requests with a
		// timeout. Pausing execution here will cause that debounce handler to be called.
		// So we avoid that pausing by just using an array of promises.
		this.textChunks.forEach( ( chunk ) => {
			const tagPromises = [],
				tags = chunk.tags;
			tags.forEach( ( tag ) => {
				const dataCX = getProp( [ 'attributes', 'data-cx' ], tag );
				if ( dataCX && Object.keys( JSON.parse( dataCX ) ).length ) {
					// Already adapted
					return;
				}
				const adapter = getAdapter( tag );
				if ( adapter && !isTransclusionFragment( tag ) ) {
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
					const adapter = getAdapter( chunk.inlineContent );
					if ( adapter && !isTransclusionFragment( chunk.inlineContent ) ) {
						adaptPromise = adapter.adapt();
					}
				}

				if ( adaptPromise ) {
					textChunkPromises.push( ( ( chk ) => adaptPromise
						.then( ( adaptedInlineContent ) => {
							chk.inlineContent = adaptedInlineContent;
						} ) )( chunk ) );
				}
			}
		} );

		return Promise.all( textChunkPromises ).then( () => this );
	}

	/**
	 * Move reference markers relative to sentence punctuation according to the
	 * target language convention (e.g. French and Polish place references before
	 * the full stop). Reference bodies are left untouched.
	 *
	 * @param {Object} options
	 * @param {string} options.policy 'before' or 'after'
	 * @param {string[]} options.punctuation Punctuation marks to reposition around
	 * @return {TextBlock} New text block with punctuation repositioned
	 */
	adaptReferencePunctuation( options ) {
		// Recurse into inline sub-documents, but not into reference bodies.
		const chunks = this.textChunks.map( ( chunk ) => {
			const inline = chunk.inlineContent;
			if ( inline && inline.adaptReferencePunctuation && !isReferenceChunk( chunk ) ) {
				return new TextChunk(
					chunk.text, chunk.tags, inline.adaptReferencePunctuation( options )
				);
			}
			return chunk;
		} );
		return new TextBlock(
			movePunctuationAcrossReferences( chunks, options.policy, options.punctuation )
		);
	}

	/**
	 * Dump an XML Array version of the linear representation, for debugging
	 *
	 * @param {string} pad Whitespace to indent XML elements
	 * @return {string[]} Array that will concatenate to an XML string representation
	 */
	dumpXmlArray( pad ) {
		const dump = [];
		for ( let i = 0, len = this.textChunks.length; i < len; i++ ) {
			const chunk = this.textChunks[ i ];
			const tagsDump = dumpTags( chunk.tags );
			const tagsAttr = tagsDump ? ' tags="' + tagsDump + '"' : '';
			if ( chunk.text ) {
				dump.push( pad + '<cxtextchunk' + tagsAttr + '>' +
					esc( chunk.text ).replace( /\n/g, '&#10;' ) +
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

export default TextBlock;
