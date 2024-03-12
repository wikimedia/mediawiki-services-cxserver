'use strict';

/**
 * @external Doc
 */

const TextChunk = require( './TextChunk' );
const cxutil = require( './../util' );

/**
 * Find all matches of regex in text, calling callback with each match object
 *
 * @param {string} text The text to search
 * @param {RegExp} regex The regex to search; should be created for this function call
 * @param {Function} callback Function to call with each match
 * @return {Array} The return values from the callback
 */
function findAll( text, regex, callback ) {
	const boundaries = [];
	while ( true ) {
		const match = regex.exec( text );
		if ( match === null ) {
			break;
		}
		const boundary = callback( text, match );
		if ( boundary !== null ) {
			boundaries.push( boundary );
		}
	}
	return boundaries;
}

/**
 * Escape text for inclusion in HTML, not inside a tag
 *
 * @private
 * @param {string} str String to escape
 * @return {string} Escaped version of the string
 */
function esc( str ) {
	return str.replace( /[&<>]/g, ( ch ) => '&#' + ch.charCodeAt( 0 ) + ';' );
}

/**
 * Escape text for inclusion inside an HTML attribute
 *
 * @private
 * @param {string} str String to escape
 * @return {string} Escaped version of the string
 */
function escAttr( str ) {
	return str.replace( /["'&<>]/g, ( ch ) => '&#' + ch.charCodeAt( 0 ) + ';' );
}

/**
 * Render a SAX open tag into an HTML string
 *
 * @private
 * @param {Object} tag Tag to render
 * @return {string} Html representation of open tag
 */
function getOpenTagHtml( tag ) {
	const html = [ '<' + esc( tag.name ) ];
	const attributes = [];
	for ( const attr in tag.attributes ) {
		attributes.push( attr );
	}
	attributes.sort();
	for ( let i = 0, len = attributes.length; i < len; i++ ) {
		const attr = attributes[ i ];
		html.push( ' ' + esc( attr ) + '="' + escAttr( String( tag.attributes[ attr ] ) ) + '"' );
	}
	if ( tag.isSelfClosing ) {
		html.push( ' /' );
	}
	html.push( '>' );
	return html.join( '' );
}

/**
 * Clone a SAX open tag
 *
 * @private
 * @param {Object} tag Tag to clone
 * @return {Object} Cloned tag
 */
function cloneOpenTag( tag ) {
	const newTag = {
		name: tag.name,
		attributes: {}
	};
	for ( const attr in tag.attributes ) {
		newTag.attributes[ attr ] = tag.attributes[ attr ];
	}
	return newTag;
}

/**
 * Render a SAX close tag into an HTML string
 *
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
 * @return {string[]} Tag names
 */
function dumpTags( tagArray ) {
	const tagDumps = [];

	if ( !tagArray ) {
		return '';
	}
	for ( let i = 0, len = tagArray.length; i < len; i++ ) {
		const tag = tagArray[ i ];
		const attrDumps = [];
		for ( const attr in tag.attributes ) {
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
 *
 * @param {Object} tag SAX open tag object
 * @return {boolean} Whether the tag is a mediawiki reference span
 */
function isReference( tag ) {
	if ( ( tag.name === 'span' || tag.name === 'sup' ) && tag.attributes.typeof === 'mw:Extension/ref' ) {
		// See https://www.mediawiki.org/wiki/Specs/HTML/2.1.0/Extensions/Cite#Auto-generated_references_blocks
		// Also see T45094
		return true;
	} else if ( tag.name === 'sup' && tag.attributes.class === 'reference' ) {
		// See "cite_reference_link" message of Cite extension
		// https://www.mediawiki.org/wiki/Extension:Cite
		return true;
	}
	return false;
}

/**
 * Detect whether this is a mediawiki maths span
 *
 * @param {Object} tag SAX open tag object
 * @return {boolean} Whether the tag is a mediawiki math span
 */
function isMath( tag ) {
	if ( ( tag.name === 'span' || tag.name === 'sup' ) && tag.attributes.typeof === 'mw:Extension/math' ) {
		return true;
	}
	return false;
}

/**
 * Detect whether this is a mediawiki Gallery
 *
 * @param {Object} tag SAX open tag object
 * @return {boolean} Whether the tag is a mediawiki Gallery
 */
function isGallery( tag ) {
	return ( tag.name === 'ul' ) && tag.attributes.typeof === 'mw:Extension/gallery';
}

function isReferenceList( tag ) {
	// See https://www.mediawiki.org/wiki/Specs/HTML/2.1.0/Extensions/Cite#Auto-generated_references_blocks
	return tag.name === 'div' && tag.attributes.typeof === 'mw:Extension/references' && tag.attributes[ 'data-mw' ];
}

/**
 * If a tag is MediaWiki external link or not.
 *
 * @param {Object} tag SAX open tag object
 * @return {boolean} Whether the tag is a external link or not.
 */
function isExternalLink( tag ) {
	return tag.name === 'a' && tag.attributes &&
		tag.attributes.rel &&
		// We add the spaces before and after to ensure matching on the "word" mw:ExtLink
		// without additional content. This is technically not necessary (we don't generate
		// mw:ExtLinkSomethingElse) nor entirely correct (attributes values could be separated by other
		// characters than 0x20), but provides a bit of future-proofing.
		( ' ' + tag.attributes.rel + ' ' ).includes( ' mw:ExtLink ' );
}

/**
 * Detect whether this is a segment.
 * Every statement in the content is a segment and these segments are
 * identified using segmentation module.
 *
 * @param {Object} tag SAX open tag object
 * @return {boolean} Whether the tag is a segment or not
 */
function isSegment( tag ) {
	if ( tag.name === 'span' && tag.attributes.class === 'cx-segment' ) {
		return true;
	}
	return false;
}

function isTransclusion( tag ) {
	return tag.attributes &&
		tag.attributes.typeof &&
		tag.attributes.typeof.match( /(^|\s)(mw:Transclusion|mw:Placeholder)\b/ );
}

function isTransclusionFragment( tag ) {
	return cxutil.getProp( [ 'attributes', 'about' ], tag ) &&
		!cxutil.getProp( [ 'attributes', 'data-mw' ], tag );
}

/**
 * Check if the tag need to be translated by an MT service.
 *
 * @param {Object} tag SAX open tag object
 * @return {boolean} Whether the tag is a segment or not
 */
function isNonTranslatable( tag ) {
	const nonTranslatableTags = [ 'style', 'svg', 'script' ];
	const nonTranslatableRdfa = [ 'mw:Entity', 'mw:Extension/math', 'mw:Extension/references', 'mw:Transclusion' ];

	const matchRdfaTypes = ( source, target ) => source.some( ( r ) => target.includes( r ) );
	const rel = tag.attributes && tag.attributes.rel;
	const typeOfAttr = tag.attributes && tag.attributes.typeof;

	return nonTranslatableTags.includes( tag.name ) ||
		( tag.attributes && (
			matchRdfaTypes( nonTranslatableRdfa,
				[ ...( rel ? rel.split( /\s/ ) : [] ), ...( typeOfAttr ? typeOfAttr.split( /\s/ ) : [] ) ] ) )
		);
}

/**
 * Determine whether a tag is an inline empty tag
 *
 * @private
 * @param {string} tagName The name of the tag (lowercase)
 * @return {boolean} Whether the tag is an inline empty tag
 */
function isInlineEmptyTag( tagName ) {
	// link/meta as they're allowed anywhere in HTML5+RDFa, and must be treated as void
	// flow content. See http://www.w3.org/TR/rdfa-in-html/#extensions-to-the-html5-syntax
	const inlineEmptyTags = [ 'br', 'img', 'source', 'track', 'link', 'meta' ];
	return inlineEmptyTags.includes( tagName );
}

/**
 * Find the boundaries that lie in each chunk
 *
 * Boundaries lying between chunks lie in the latest chunk possible.
 * Boundaries at the start of the first chunk, or the end of the last, are not included.
 * Therefore zero-width chunks never have any boundaries
 *
 * @param {number[]} boundaries Boundary offsets
 * @param {Object[]} chunks Chunks to which the boundaries apply
 * @param {Function} getLength Function returning the length of a chunk
 * @return {Object[]} Array of {chunk: ch, boundaries: [...]}
 */
function getChunkBoundaryGroups( boundaries, chunks, getLength ) {
	const groups = [];
	let offset = 0,
		boundaryPtr = 0;

	// Get boundaries in order, disregarding the start of the first chunk
	boundaries = boundaries.slice();
	boundaries.sort( ( a, b ) => a - b );
	while ( boundaries[ boundaryPtr ] === 0 ) {
		boundaryPtr++;
	}
	for ( let i = 0, len = chunks.length; i < len; i++ ) {
		const groupBoundaries = [];
		const chunk = chunks[ i ];
		const chunkLength = getLength( chunk );
		while ( true ) {
			const boundary = boundaries[ boundaryPtr ];
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
 * Add a tag to consecutive text chunks, above common tags but below others
 *
 * @private
 * @param {TextChunk[]} textChunks Consecutive text chunks
 * @param {Object} tag Tag to add
 * @return {TextChunk[]} Copy of the text chunks with the tag inserted
 */
function addCommonTag( textChunks, tag ) {
	if ( textChunks.length === 0 ) {
		return [];
	}
	// Find length of common tags
	const commonTags = textChunks[ 0 ].tags.slice();
	for ( let i = 1, iLen = textChunks.length; i < iLen; i++ ) {
		const tags = textChunks[ i ].tags;
		let j, jLen;
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
	const commonTagLength = commonTags.length;
	// Build new chunks with segment span inserted
	const newTextChunks = [];
	for ( let i = 0, iLen = textChunks.length; i < iLen; i++ ) {
		const textChunk = textChunks[ i ];
		const newTags = textChunk.tags.slice();
		newTags.splice( commonTagLength, 0, tag );
		newTextChunks.push( new TextChunk(
			textChunk.text,
			newTags,
			textChunk.inlineContent
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
	for ( let i = 0, iLen = textChunks.length; i < iLen; i++ ) {
		const tags = textChunks[ i ].tags;
		for ( let j = 0, jLen = tags.length; j < jLen; j++ ) {
			const tag = tags[ j ];
			if (
				tag.name === 'a' &&
				tag.attributes.href !== undefined &&
				tag.attributes.rel &&
				// We add the spaces before and after to ensure matching on the "word" mw:WikiLink
				// without additional content to avoid matching on mw:WikiLink/Interwiki and mw:WikiLink/ISBN.
				( ' ' + tag.attributes.rel + ' ' ).includes( ' mw:WikiLink ' ) &&
				tag.attributes[ 'data-linkid' ] === undefined
			) {
				// Hack: copy href, then remove it, then re-add it, so that
				// attributes appear in alphabetical order (ugh)
				const href = tag.attributes.href;
				delete tag.attributes.href;
				tag.attributes.class = [ tag.attributes.class, 'cx-link' ].join( ' ' ).trim();
				tag.attributes[ 'data-linkid' ] = getNextId( 'link' );
				tag.attributes.href = href;
			}
		}
	}
}

/**
 * Check if the passed document is a section containing block level template or reference list
 * so that we can ignore from passing to MT engines
 *
 * @param {Doc} sectionDoc
 * @return {boolean}
 */
function isIgnorableBlock( sectionDoc ) {
	let ignorable = false;
	const blockStack = [];
	let firstBlockTemplate = null;
	// We start with index 1 since the first tag will be <section>.
	for ( let i = 1, len = sectionDoc.items.length; i < len; i++ ) {
		const item = sectionDoc.items[ i ];
		const tag = item.item;
		const type = item.type;

		if ( type === 'open' ) {
			blockStack.push( tag );
			if ( !firstBlockTemplate && ( isTransclusion( tag ) || isReferenceList( tag ) ) ) {
				firstBlockTemplate = tag;
			}
		}
		if ( type === 'close' ) {
			const currentCloseTag = blockStack.pop();
			if ( currentCloseTag &&
				blockStack.length === 0 &&
				( ( isTransclusion( currentCloseTag ) &&
				currentCloseTag.attributes.about === firstBlockTemplate.attributes.about ) ||
				isReferenceList( currentCloseTag ) )
			) {
				return true;
			}
		}

		// Also check for textblocks
		if ( !firstBlockTemplate && item.type === 'textblock' ) {
			const rootItem = item.item.getRootItem();
			if ( rootItem && isNonTranslatable( rootItem ) ) {
				firstBlockTemplate = rootItem;
				// Textblock is a transclusion. Do not translate.
				// But do not return yet. Check if there is any other textblocks translatable
				ignorable = true;
			} else {
				// There is non ignorable content to translate
				return false;
			}
		}
	}
	return ignorable;
}

module.exports = {
	addCommonTag,
	cloneOpenTag,
	dumpTags,
	esc,
	findAll,
	getChunkBoundaryGroups,
	getCloseTagHtml,
	getOpenTagHtml,
	isIgnorableBlock,
	isExternalLink,
	isGallery,
	isInlineEmptyTag,
	isMath,
	isReference,
	isSegment,
	isTransclusion,
	isTransclusionFragment,
	isNonTranslatable,
	setLinkIdsInPlace
};
