'use strict';

var LinearDoc = require( __dirname + '/../lineardoc' ),
	BBPromise = require( 'bluebird' ),
	SubSequenceMatcher = require( './annotationmapper/SubsequenceMatcher.js' );

/**
 * MTClient - Generic machine translation client.
 *
 * @class
 *
 * @constructor
 */
function MTClient() {
	this.sourceDoc = null;
	this.sourceHTML = null;
}

MTClient.prototype.log = function ( level, info ) {
	if ( this.logger && this.logger.log ) {
		this.logger.log( level, info );
	}
};

/**
 * Translate the given content between the language pairs.
 *
 * @param {string} sourceLang Source language code
 * @param {string} targetLang Target language code
 * @param {string} content Content to translate
 * @param {string} format Content to translate
 * @param {string} [format] Format of the content- html or text. Default is html.
 * @return {Object} Deferred promise: Target language text
 */
MTClient.prototype.translate = function ( sourceLang, targetLang, content, format ) {
	if ( format === 'text' ) {
		return this.translateText( sourceLang, targetLang, content );
	} else {
		return this.translateHtml( sourceLang, targetLang, content );
	}
};

/**
 * Translate marked-up text
 *
 * @param {string} sourceLang Source language code
 * @param {string} targetLang Target language code
 * @param {string} sourceHtml Source html
 * @return {Promise} promise: Translated html
 */
MTClient.prototype.translateHtml = function ( sourceLang, targetLang, sourceHtml ) {
	var i, len, targetDoc, itemPromises, chain = [],
		self = this;

	this.buildSourceDoc( sourceHtml );
	// Clone and adapt sourceDoc
	targetDoc = new LinearDoc.Doc( this.sourceDoc.wrapperTag );
	itemPromises = [];

	function translateItemDeferred( item ) {
		if ( item.type !== 'textblock' ) {
			return BBPromise.resolve( item );
		}

		return self.translateTextWithTagOffsets(
			sourceLang,
			targetLang,
			item.item.getPlainText(),
			item.item.getTagOffsets()
		).then( function ( translated ) {
			var newTextBlock;

			newTextBlock = item.item.translateTags(
				translated.text, translated.rangeMappings
			);

			return {
				type: 'textblock',
				item: newTextBlock
			};
		} );
	}

	for ( i = 0, len = this.sourceDoc.items.length; i < len; i++ ) {
		chain.push( translateItemDeferred( this.sourceDoc.items[ i ] ) );
	}

	return BBPromise.all( chain ).then( function ( results ) {
		targetDoc.items = results;
		return targetDoc.getHtml();
	} );
};

/**
 * Translate text, using case variants to map tag offsets
 *
 * @param {string} sourceLang Source language code
 * @param {string} targetLang Target language code
 * @param {string} sourceText Source plain text
 * @param {Object[]} tagOffsets start and length for each annotation chunk
 * @return {Object} Deferred promise: Translated plain text and range mappings
 */
MTClient.prototype.translateTextWithTagOffsets = function ( sourceLang, targetLang, sourceText, tagOffsets ) {
	var subSequences, sourceLines, i, m, preSpaces, postSpaces, trimmedSourceLines,
		self = this;

	subSequences = this.getSubSequences( sourceLang, sourceText, tagOffsets );
	sourceLines = subSequences.map( function ( variant ) {
		return variant.text;
	} );
	sourceLines.splice( 0, 0, sourceText );

	// Strip and store leading/trailing whitespace before sending text to MT server
	preSpaces = [];
	postSpaces = [];
	trimmedSourceLines = [];
	for ( i = 0; i < sourceLines.length; i++ ) {
		// Search for zero or more leading and trailing spaces. This will always match.
		m = sourceLines[ i ].match( /^(\s*)([\s\S]*?)(\s*)$/ );
		if ( !m ) {
			// See https://phabricator.wikimedia.org/T86625. This not supposed to happen.
			this.log( 'error', 'Regex to extract trailing and leading space failed for ' + sourceLines[ i ] );
			m = [ '', '', sourceLines[ i ], '' ];
		}
		preSpaces[ i ] = m[ 1 ];
		trimmedSourceLines[ i ] = m[ 2 ];
		postSpaces[ i ] = m[ 3 ];
	}

	// Join segments with a string that will definitely break sentences and be preserved
	return self.translateLines(
		sourceLang,
		targetLang,
		trimmedSourceLines
	).then( function ( unnormalizedTargetLines ) {
		var targetLines, targetText, rangeMappings;

		// Restore leading/trailing whitespace from source
		targetLines = unnormalizedTargetLines.map( function ( line, i ) {
			return preSpaces[ i ] + line.replace( /^\s+|\s+$/g, '' ) + postSpaces[ i ];
		} );
		try {
			targetText = targetLines.splice( 0, 1 )[ 0 ];
			rangeMappings = self.getSequenceMappings(
				targetLang,
				subSequences,
				targetText,
				targetLines
			);
		} catch ( ex ) {
			// If annotation mapping fails for any reason, return translated text
			// without annotations.
			self.log( 'debug/mt', 'Error while mapping annotations ' + ex.stack );
			rangeMappings = {};
		}
		return {
			text: targetText,
			rangeMappings: rangeMappings
		};
	} );

};

/**
 * Translate multiple lines of plaintext
 *
 * The output may need normalizing for leading/trailing whitespace etc.
 *
 * @param {string} sourceLang Source language code
 * @param {string} targetLang Target language code
 * @param {string[]} sourceLines Source plaintext lines
 * @return {Promise} Translated plaintext lines
 */
MTClient.prototype.translateLines = function ( sourceLang, targetLang, sourceLines ) {
	var sourceLinesText;

	// Join lines into single string. Separator must break sentences and pass through unchanged
	// Using Devangari separator Double Danda twice.
	sourceLinesText = sourceLines.join( '.॥॥.' );

	return this.translateText(
		sourceLang,
		targetLang,
		sourceLinesText
	).then( function ( targetLinesText ) {
		var targetText = targetLinesText.split( /\.॥॥\./g );
		return targetText;
	} );
};

/**
 * Create variants of the text, with a different annotation uppercased in each.
 *
 * @param {string} lang Language code
 * @param {string} sourceText Text
 * @param {Object[]} annotationOffsets start and length of each annotation
 * @return {Object[]}
 * @return {number} Object.start Start offset of uppercasing
 * @return {number} Object.length Length of uppercasing
 * @return {string} Object.text Text variant with uppercasing
 */
MTClient.prototype.getSubSequences = function ( lang, sourceText, annotationOffsets ) {
	var i, len, offset, subSequences = [];

	for ( i = 0, len = annotationOffsets.length; i < len; i++ ) {
		offset = annotationOffsets[ i ];
		subSequences.push( {
			start: offset.start,
			length: offset.length,
			text: sourceText.slice( offset.start, offset.start + offset.length )
		} );
	}
	return subSequences;
};

/**
 * Check if a range already exist in the array of ranges already located.
 * A range is start position and length indicating position of certain text
 * in a bigger text.
 * This is not just a membership check. If the range we are checking
 * falls under the start and end position of an already existing range, then also
 * we consider it as an overlapping range.
 * For example [start:5, length:4] and [start:6, length:3] overlaps.
 *
 * @param {Object} range
 * @param {Object[]} rangeArray
 * @return {boolean} Whether the range overlap or exist in any range in the given
 *   range array
 */
function isOverlappingRange( range, rangeArray ) {
	var i, rangeStart, rangeEnd, start, end;

	rangeStart = range.start;
	rangeEnd = range.start + range.length;
	for ( i = 0; i < rangeArray.length; i++ ) {
		start = rangeArray[ i ].start;
		end = start + rangeArray[ i ].length;
		if ( start >= rangeStart && end <= rangeEnd ||
			start <= rangeStart && end >= rangeEnd ) {
			return true;
		}
	}

	return false;
}

/**
 * Calculate range mappings based on the target text variants.
 *
 * @param {string} targetLang The target language.
 * @param {Object[]} subSequences The start and length of each subsequence.
 * @param {string} targetText The translated text.
 * @param {Object} targetLines Translation of each subsequences.
 * @return {Object[]} The location of source and translation sequences in the text.
 * @return {number} Object.source.start {number} Start position of source subSequence in the text.
 * @return {number} Object.source.length {number} Length of source subSequence in the text.
 * @return {number} Object.target.start {number} Start position of sequence in the text.
 * @return {number} Object.target.length {number} Length of matched sequence in the text.
 */
MTClient.prototype.getSequenceMappings = function ( targetLang, subSequences, targetText, targetLines ) {
	var i, iLen, targetRange, sourceRange, subSequence,
		rangeMappings = [],
		targetRanges = [],
		occurrences = {};

	if ( subSequences.length !== targetLines.length ) {
		// We must have translation for all subSequences.
		throw new Error( 'Translation variants length mismatch' );
	}

	for ( i = 0, iLen = subSequences.length; i < iLen; i++ ) {
		subSequence = subSequences[ i ];
		sourceRange = {
			start: subSequence.start,
			length: subSequence.length
		};
		// Keep track of repeated occurrences of a subsequence in the text. A word can repeat
		// in a translation block.
		occurrences[ subSequence.text ] =
			occurrences[ subSequence.text ] === undefined ? 0 : occurrences[ subSequence.text ] + 1;
		// Find the position of the translated subsequence in translated text.
		// This involves a non-trivial fuzzy matching algorithm
		targetRange = this.findSubSequence(
			targetText, targetLines[ i ], targetLang, occurrences[ subSequence.text ]
		);

		if ( targetRange && !isOverlappingRange( targetRange, targetRanges ) ) {
			// targetRanges keep track of all ranges we located. Used for overlap
			// detection.
			targetRanges.push( targetRange );
			rangeMappings.push( {
				source: sourceRange,
				target: targetRange
			} );
		}
	}
	return rangeMappings;
};

/**
 * Locate the given sequence in the translated text.
 * Example:
 *   Searching  'tropical' in 'They are subtropical and tropical flowers.', 'tropical',
 *   returns { start: 12, length: 8 }
 *
 * @param {string} text The translated text.
 * @param {string} sequence The search string.
 * @param {string} language Language of the text. Used for language specific matching.
 * @param {number} occurrence Pass 1 for first occurrence, 2 for second occurrence, so on.
 * @return {null|Object} The location of the sequence in the text.
 * @return {null|number} Object.start {number} Start position of sequence in the text.
 * @return {null|number} Object.lengthLength of matched sequence in the text.
 */
MTClient.prototype.findSubSequence = function ( text, sequence, language, occurrence ) {
	var indices, matcher;

	matcher = new SubSequenceMatcher( language );
	indices = matcher.findFuzzyMatch( text, sequence );
	// Find the nth occurrence position

	if ( !indices || indices.length < occurrence ) {
		return null;
	}
	if ( occurrence === 0 ) {
		return matcher.bestMatch( indices );
	}
	return indices[ occurrence ];
};

/**
 * Build the LinearDoc for the given source html
 *
 * @param {string} sourceHtml The html content
 */
MTClient.prototype.buildSourceDoc = function ( sourceHtml ) {
	var parser;

	if ( this.sourceDoc ) {
		return;
	}

	if ( !sourceHtml ) {
		throw new Error( 'Invalid sourceHtml' );
	}

	parser = new LinearDoc.Parser( {
		// For the proper annotation mapping between source and translated content,
		// we need to treat each sentence as isolated.
		// In other words, trying to find mappings in a sentence context has better results
		// compared to the mapping done in a whole paragraph content.
		isolateSegments: true
	} );
	parser.init();
	parser.write( sourceHtml );
	this.sourceHTML = sourceHtml;
	this.sourceDoc = parser.builder.doc;
};

/**
 * Whether this engine needs authentication with JWT
 *
 * @return {boolean}
 */
MTClient.prototype.requiresAuthorization = function () {
	return false;
};

module.exports = MTClient;
