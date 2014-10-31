var apertiumLangMapping,
	Q = require( 'q' ),
	request = require( 'request' ),
	conf = require( __dirname + '/../utils/Conf.js' ),
	LinearDoc = require( '../lineardoc/LinearDoc' ),
	//logger = require( '../utils/Logger.js' ),
	// TODO: Tokenize properly. These work for English/Spanish/Catalan
	TOKENS = /[\wáàçéèíïóòúüñÁÀÇÉÈÍÏÓÒÚÜÑ]+(?:[·'][\wáàçéèíïóòúüñÁÀÇÉÈÍÏÓÒÚÜÑ]+)?|[^\wáàçéèíïóòúüñÁÀÇÉÈÍÏÓÒÚÜÑ]+/g,
	IS_WORD = /^[\wáàçéèíïóòúüñÁÀÇÉÈÍÏÓÒÚÜÑ]+(?:[·'][\wáàçéèíïóòúüñÁÀÇÉÈÍÏÓÒÚÜÑ]+)?$/;

apertiumLangMapping = require( __dirname + '/mappings.js' );

/**
 * Split text into tokens
 * @param {string} lang Language code
 * @param {string} text Text to split
 * @return {Object[]} List of tokens
 * @return[].text Text of the token
 * @return[].isWord Whether the token is a word
 */
function getTokens( lang, text ) {
	// TODO: implement for other languages than English/Spanish/Catalan
	return text.match( TOKENS ).map( function ( tokenText ) {
		return {
			text: tokenText,
			isWord: !!tokenText.match( IS_WORD )
		};
	} );
}

/**
 * Language-aware uppercasing
 * @param {string} lang Language code
 * @param {string} text Text to uppercase
 * @return {string} Upper-cased text (possibly identical)
 */
function toUpperCase( lang, text ) {
	// stub: just use the javascript ASCII method for now
	return text.toUpperCase();
}

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
function getCaseVariants( lang, sourceText, annotationOffsets ) {
	var i, len, offset, chunk, upperChunk, variantText,
		caseVariants = [];

	for ( i = 0, len = annotationOffsets.length; i < len; i++ ) {
		offset = annotationOffsets[ i ];
		chunk = sourceText.slice( offset.start, offset.start + offset.length );
		upperChunk = toUpperCase( lang, chunk );
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
}

/**
 * Finds offsets of ranges at which tokens have changed to uppercase
 * @param {string} text Original text
 * @param {string} text Changed text
 * @return {Object[]} start and length for each changed range
 */
function getChangedCaseRanges( lang, originalText, changedText ) {
	var orig, upper, changed, len, ranges, start, startChar, end, endChar;
	orig = getTokens( lang, originalText );
	upper = getTokens( lang, toUpperCase( lang, originalText ) );
	changed = getTokens( lang, changedText );

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
		while ( start < len && (
			!( orig[ start ].isWord ) ||
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

		while ( end < len && (
			!( orig[ end ].isWord ) ||
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
}

/**
 * Calculate range mappings based on the target text variants
 * @param {string} targetLang The target language
 * @param {Object[]} sourceVariants The start and length of each variation
 * @param {
 * @param {Object} annotationOffsets The start and length of each offset, by sourceVariantId
 */
function getRangeMappings( targetLang, sourceVariants, targetText, targetLines ) {
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
		changedCaseRanges = getChangedCaseRanges(
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
}

/**
 * Translate plain text with Apertium API
 * @param {string} sourceLang Source language code
 * @param {string} targetLang Target language code
 * @param {string} sourceText Source language text
 * @return {Object} Deferred promise: Target language text
 */
function translateTextApertium( sourceLang, targetLang, sourceText ) {
	var deferred = Q.defer(),
		postData;

	postData = {
		url: conf( 'mt.apertium.api' ) + '/translate',
		form: {
			markUnknown: 0,
			langpair: apertiumLangMapping[ sourceLang ] + '|' + apertiumLangMapping[ targetLang ],
			format: 'txt',
			q: sourceText
		}
	};
	request.post( postData,
		function ( error, response, body ) {
			var message;
			if ( error ) {
				deferred.reject( new Error( error ) );
				return;
			}
			if ( response.statusCode !== 200 ) {
				message = 'Error ' + response.statusCode;
				message += ' sourceText={' + sourceText + '}, body={' + body + '}';
				deferred.reject( new Error( message ) );
				return;
			}
			deferred.resolve( JSON.parse( body ).responseData.translatedText );
		}
	);
	return deferred.promise;
}

/**
 * Translate multiple lines of plaintext with apertium
 * @param {string} sourceLang Source language code
 * @param {string} targetLang Target language code
 * @param {string[]} sourceLines Source plaintext lines
 * @return {Object} Deferred promise: Translated plaintext lines
 */
function translateLinesApertium( sourceLang, targetLang, sourceLines ) {
	var sourceLinesText,
		deferred = Q.defer();
	// Join lines into single string. Separator must break sentences and pass through unchanged
	sourceLinesText = sourceLines.join( '\n.CxServerApertium.\n' );
	translateTextApertium(
		sourceLang,
		targetLang,
		sourceLinesText
	).then( function ( targetLinesText ) {
		var targetText = targetLinesText
			.replace( /^\s+|\s+$/g, '' )
			.split( /\n\.CxServerApertium\.\n/g );
		deferred.resolve( targetText );
	}, function ( error ) {
		deferred.reject( error );
	} );
	return deferred.promise;
}

/**
 * Translate text, using case variants to map tag offsets
 * @param {string} sourceLang Source language code
 * @param {string} targetLang Target language code
 * @param {string} sourceText Source plain text
 * @param {Object[]} tagOffsets start and length for each annotation chunk
 * @return {Object} Deferred promise: Translated plain text and range mappings
 */
function translateTextWithTagOffsets( sourceLang, targetLang, sourceText, tagOffsets ) {
	var sourceVariants, sourceLines, m, preSpace, postSpace, trimmedSourceLines, deferred;
	sourceVariants = getCaseVariants( sourceLang, sourceText, tagOffsets );
	sourceLines = sourceVariants.map( function ( variant ) {
		return variant.text;
	} );
	sourceLines.splice( 0, 0, sourceText );

	// Don't push leading and trailing whitespace through Apertium
	m = sourceText.match( /^(\s*).*?(\s*)$/ );
	preSpace = m[ 1 ];
	postSpace = m[ 2 ];
	trimmedSourceLines = sourceLines.map( function ( line ) {
		return line.substring( preSpace.length, line.length - postSpace.length );
	} );

	deferred = Q.defer();
	// Call apertium through module.exports, so tests can override it
	// Join segments with a string that will definitely break sentences and be preserved
	module.exports.translateLinesApertium(
		sourceLang,
		targetLang,
		trimmedSourceLines
	).then( function ( trimmedTargetLines ) {
		var targetLines, targetText, rangeMappings;
		targetLines = trimmedTargetLines.map( function ( trimmedTargetLine ) {
			return preSpace + trimmedTargetLine + postSpace;
		} );
		try {
			targetText = targetLines.splice( 0, 1 )[ 0 ];
			rangeMappings = getRangeMappings(
				targetLang,
				sourceVariants,
				targetText,
				targetLines
			);
		} catch ( ex ) {
			deferred.reject( ex );
			return;
		}
		deferred.resolve( {
			text: targetText,
			rangeMappings: rangeMappings
		} );
	}, function ( error ) {
		deferred.reject( error );
	} );
	return deferred.promise;
}

/**
 * Translate marked-up text
 * @param {string} sourceLang Source language code
 * @param {string} targetLang Target language code
 * @param {string} sourceText Source html
 * @return {Object} Deferred promise: Translated html
 */
function translate( sourceLang, targetLang, sourceHtml ) {
	var i, len, sourceDoc, targetDoc, itemPromises, deferred,
		parser = new LinearDoc.Parser();
	parser.init();
	parser.write( sourceHtml );
	sourceDoc = parser.builder.doc;
	// Clone and adapt sourceDoc
	targetDoc = new LinearDoc.Doc( sourceDoc.wrapperTag );
	itemPromises = [];

	function translateItemDeferred( deferred, item ) {
		itemPromises.push( deferred.promise );
		if ( item.type !== 'textblock' ) {
			deferred.resolve( item );
			return;
		}
		translateTextWithTagOffsets(
			sourceLang,
			targetLang,
			item.item.getPlainText(),
			item.item.getTagOffsets()
		).then( function ( translated ) {
			var newTextBlock;
			try {
				newTextBlock = item.item.translateTags(
					translated.text, translated.rangeMappings
				);
				deferred.resolve( {
					type: 'textblock',
					item: newTextBlock
				} );
			} catch ( ex ) {
				deferred.reject( ex );
			}
		}, function ( error ) {
			deferred.reject( error );
		} );
	}
	for ( i = 0, len = sourceDoc.items.length; i < len; i++ ) {
		translateItemDeferred( Q.defer(), sourceDoc.items[ i ] );
	}
	deferred = Q.defer();
	Q.all( itemPromises ).spread( function () {
		targetDoc.items = Array.prototype.slice.call( arguments, 0 );
		deferred.resolve( targetDoc.getHtml() );
	}, function ( error ) {
		deferred.reject( error );
	} );
	return deferred.promise;
}

module.exports = {
	translate: translate,
	translateLinesApertium: translateLinesApertium,
	getTokens: getTokens
};
