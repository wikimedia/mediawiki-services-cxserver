var LinearDoc = require( '../lineardoc/LinearDoc' ),
	TOKENS = /[\wáàçéèíïóòúüñÁÀÇÉÈÍÏÓÒÚÜÑ]+(?:[·'][\wáàçéèíïóòúüñÁÀÇÉÈÍÏÓÒÚÜÑ]+)?|[^\wáàçéèíïóòúüñÁÀÇÉÈÍÏÓÒÚÜÑ]+/g,
	IS_WORD = /^[\wáàçéèíïóòúüñÁÀÇÉÈÍÏÓÒÚÜÑ]+(?:[·'][\wáàçéèíïóòúüñÁÀÇÉÈÍÏÓÒÚÜÑ]+)?$/;

/**
 * MTClient - Parent class for all MT clients.
 * @class
 *
 * @constructor
 */
function MTClient() {
	this.sourceDoc = null;
	this.sourceHTML = null;
}

/**
 * Split text into tokens
 * @param {string} lang Language code
 * @param {string} text Text to split
 * @return {Object[]} List of tokens
 * @return[].text Text of the token
 * @return[].isWord Whether the token is a word
 */
MTClient.prototype.getTokens = function ( lang, text ) {
	// TODO: implement for other languages than English/Spanish/Catalan
	return text.match( TOKENS ).map( function ( tokenText ) {
		return {
			text: tokenText,
			isWord: !!tokenText.match( IS_WORD )
		};
	} );
};

/**
 * Language-aware uppercasing
 * @param {string} lang Language code
 * @param {string} text Text to uppercase
 * @return {string} Upper-cased text (possibly identical)
 */
MTClient.prototype.toUpperCase = function ( lang, text ) {
	// stub: just use the javascript ASCII method for now
	return text.toUpperCase();
};

/**
 * Create variants of the text, with a different annotation uppercased in each.
 * @param {string} lang Language code
 * @param {string} text Text
 * @param {Object[]} annotationOffsets start and length of each annotation
 * @return {Object[]}
 * @return[].start {number} Start offset of uppercasing
 * @return[].length {number} Length of uppercasing
 * @return[].text {string} Text variant with uppercasing
 */
MTClient.prototype.getCaseVariants = function ( lang, sourceText, annotationOffsets ) {
	var i, len, offset, chunk, upperChunk, variantText,
		caseVariants = [];

	for ( i = 0, len = annotationOffsets.length; i < len; i++ ) {
		offset = annotationOffsets[ i ];
		chunk = sourceText.slice( offset.start, offset.start + offset.length );
		upperChunk = this.toUpperCase( lang, chunk );
		if ( upperChunk === chunk ) {
			// Already uppercased; can't detect change
			continue;
		}
		variantText = [
			sourceText.slice( 0, offset.start ),
			upperChunk,
			sourceText.slice( offset.start + offset.length )
		].join( '' );
		caseVariants.push( {
			start: offset.start,
			length: offset.length,
			text: variantText
		} );
	}
	return caseVariants;
};

/**
 * Finds offsets of ranges at which tokens have changed to uppercase
 * @param {string} text Original text
 * @param {string} text Changed text
 * @return {Object[]} start and length for each changed range
 */
MTClient.prototype.getChangedCaseRanges = function ( lang, originalText, changedText ) {
	var orig, upper, changed, len, ranges, start, startChar, end, endChar;

	orig = this.getTokens( lang, originalText );
	upper = this.getTokens( lang, this.toUpperCase( lang, originalText ) );
	changed = this.getTokens( lang, changedText );

	len = orig.length;
	if ( len !== upper.length || len !== changed.length ) {
		throw new Error( 'token length mismatch' );
	}

	// Find start/end of changed text token ranges. Track char ranges too, and store these.
	ranges = [];
	// start token
	start = 0;
	// start char
	startChar = 0;

	while ( true ) {
		// Skip to first changed word token
		while ( start < len && ( !( orig[ start ].isWord ) ||
			(
				orig[ start ].text === changed[ start ].text ||
				upper[ start ].text !== changed[ start ].text
			)
		) ) {
			startChar += orig[ start ].text.length;
			start++;
		}
		if ( start >= len ) {
			break;
		}
		// Find last consecutive changed non-word token
		end = start;
		endChar = startChar + orig[ end ].text.length;

		while ( end < len && ( !( orig[ end ].isWord ) ||
			(
				orig[ end ].text !== upper[ end ].text &&
				upper[ end ].text === changed[ end ].text
			)
		) ) {
			end++;
			if ( end < len ) {
				endChar += orig[ end ].text.length;
			}
		}
		do {
			if ( end < len ) {
				endChar -= orig[ end ].text.length;
			}
			end--;
		} while ( !( orig[ end ].isWord ) );
		// Store ranges
		ranges.push( {
			start: startChar,
			length: endChar - startChar
		} );
		start = end + 1;
		startChar = endChar;
	}
	return ranges;
};

/**
 * Calculate range mappings based on the target text variants
 * @param {string} targetLang The target language
 * @param {Object[]} sourceVariants The start and length of each variation
 * @param {
 * @param {Object} annotationOffsets The start and length of each offset, by sourceVariantId
 */
MTClient.prototype.getRangeMappings = function ( targetLang, sourceVariants, targetText, targetLines ) {
	var i, iLen, j, jLen, changedCaseRanges, sourceRange,
		rangeMappings = [];
	if ( sourceVariants.length !== targetLines.length ) {
		throw new Error( 'Translation variants length mismatch' );
	}
	for ( i = 0, iLen = sourceVariants.length; i < iLen; i++ ) {
		sourceRange = {
			start: sourceVariants[ i ].start,
			length: sourceVariants[ i ].length
		};
		changedCaseRanges = this.getChangedCaseRanges(
			targetLang,
			targetText,
			targetLines[ i ]
		);
		for ( j = 0, jLen = changedCaseRanges.length; j < jLen; j++ ) {
			rangeMappings.push( {
				source: sourceRange,
				target: changedCaseRanges[ j ]
			} );
		}
	}
	return rangeMappings;
};

MTClient.prototype.buildSourceDoc = function ( sourceHtml ) {
	var parser;

	if ( this.sourceDoc ) {
		return;
	}
	if ( !sourceHtml ) {
		throw new Error( 'Invalid sourceHtml' );
	}
	parser = new LinearDoc.Parser();
	parser.init();
	parser.write( sourceHtml );
	this.sourceHTML = sourceHtml;
	this.sourceDoc = parser.builder.doc;
};

MTClient.prototype.getSubSequencesAsText = function () {
	var i, j, sequences, subsquences = [];

	if ( !this.sourceDoc ) {
		throw new Error( 'Build the sourceDoc model by calling buildSourceDoc.' );
	}
	sequences = this.sourceDoc.getSubSequences();
	for ( i = 0; i < sequences.length; i++ ) {
		for ( j = 0; j < sequences[ i ].length; j++ ) {
			subsquences.push( sequences[ i ][ j ].text );
		}
	}
	return subsquences;
};

/**
 * Get the plain text version of given html content.
 * @return {string} The plain text of given html content.
 */
MTClient.prototype.toPlainText = function () {
	var i, len, item, plainText = [];
	this.buildSourceDoc( this.sourceHtml );
	for ( i = 0, len = this.sourceDoc.items.length; i < len; i++ ) {
		item = this.sourceDoc.items[ i ];
		if ( item.type === 'textblock' ) {
			plainText.push( item.item.getPlainText() );
		}
	}
	return plainText.join( '' );
};

module.exports = MTClient;
