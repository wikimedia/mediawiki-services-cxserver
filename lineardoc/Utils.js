'use strict';

var TextChunk = require( './TextChunk.js' );

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
 *
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
 *
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
 *
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
		attr = attributes[ i ];
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
 *
 * @private
 * @param {Object} tag Tag to clone
 * @return {Object} Cloned tag
 */
function cloneOpenTag( tag ) {
	var attr, newTag = {
		name: tag.name,
		attributes: {}
	};
	for ( attr in tag.attributes ) {
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
 *
 * @param {Object} tag SAX open tag object
 * @return {boolean} Whether the tag is a mediawiki reference span
 */
function isReference( tag ) {
	if ( tag.name === 'span' && tag.attributes.typeof === 'mw:Extension/ref' ) {
		// See https://www.mediawiki.org/wiki/Parsoid/MediaWiki_DOM_spec#Ref_and_References
		return true;
	} else if ( tag.name === 'sup' && tag.attributes.class === 'reference' ) {
		// See "cite_reference_link" message of Cite extension
		// https://www.mediawiki.org/wiki/Extension:Cite
		return true;
	}
	return false;
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
	return tagName === 'br' || tagName === 'img' || tagName === 'link' || tagName === 'meta';
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
	var i, len, groupBoundaries, chunk, chunkLength, boundary,
		groups = [],
		offset = 0,
		boundaryPtr = 0;

	// Get boundaries in order, disregarding the start of the first chunk
	boundaries = boundaries.slice();
	boundaries.sort( function ( a, b ) {
		return a - b;
	} );
	while ( boundaries[ boundaryPtr ] === 0 ) {
		boundaryPtr++;
	}
	for ( i = 0, len = chunks.length; i < len; i++ ) {
		groupBoundaries = [];
		chunk = chunks[ i ];
		chunkLength = getLength( chunk );
		while ( true ) {
			boundary = boundaries[ boundaryPtr ];
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

module.exports = {
	esc: esc,
	findAll: findAll,
	dumpTags: dumpTags,
	setLinkIdsInPlace: setLinkIdsInPlace,
	addCommonTag: addCommonTag,
	getChunkBoundaryGroups: getChunkBoundaryGroups,
	isReference: isReference,
	isSegment: isSegment,
	getOpenTagHtml: getOpenTagHtml,
	isInlineEmptyTag: isInlineEmptyTag,
	getCloseTagHtml: getCloseTagHtml,
	cloneOpenTag: cloneOpenTag
};
