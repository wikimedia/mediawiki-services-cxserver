'use strict';

const LinearDoc = require( __dirname + '/../lineardoc' ),
	SubSequenceMatcher = require( './annotationmapper/SubsequenceMatcher.js' ),
	createDOMPurify = require( 'dompurify' ),
	cxUtil = require( '../util.js' ),
	jsdom = require( 'jsdom' );

/**
 * MTClient - Generic machine translation client.
 */
class MTClient {
	/**
	 * @param {Object} options
	 */
	constructor( options ) {
		this.logger = options.logger;
		this.metrics = options.metrics;
		this.conf = options.conf;
		this.sourceDoc = null;
		this.sourceHTML = null;
		this.contentWrapped = false;
		// Per instance cache. This is also per-request cache
		this.translationcache = {};
	}

	log( level, info ) {
		if ( this.logger && this.logger.log ) {
			this.logger.log( level, info );
		}
	}

	/**
	 * Translate the given content between the language pairs.
	 *
	 * @param {string} sourceLang Source language code
	 * @param {string} targetLang Target language code
	 * @param {string} content Content to translate
	 * @param {string} [format="html"] Format of the content- html or text
	 * @return {Object} Deferred promise: Target language text
	 */
	translate( sourceLang, targetLang, content, format ) {
		if ( format === 'text' || cxUtil.isPlainText( content ) ) {
			// Check if the text content is translated in the same request
			// When adapting content with links and annotations, as part of
			// rich text translation, many fragments(example: link text) will
			// be already individually translated. Later when adapting links
			// The link titles will require translation and it can just reuse
			// the previous translations.
			const cacheKey = content.toLowerCase();
			if ( this.translationcache[ cacheKey ] ) {
				return Promise.resolve( this.translationcache[ cacheKey ] );
			}
			return this.translateText( sourceLang, targetLang, content ).then( ( translation ) => {
				this.translationcache[ cacheKey ] = translation;
				return translation;
			} );
		} else {
			return this.translateHtml( sourceLang, targetLang, content );
		}
	}

	/**
	 * Translate marked-up text by reducing(compacting) it and expanding
	 * after it is translated.
	 *
	 * @param {string} sourceLang Source language code
	 * @param {string} targetLang Target language code
	 * @param {string} sourceHtml Source html
	 * @return {Promise} Promise that resolves translated html
	 */
	translateReducedHtml( sourceLang, targetLang, sourceHtml ) {
		this.buildSourceDoc( sourceHtml );

		if ( LinearDoc.Utils.isIgnorableBlock( this.sourceDoc ) ) {
			// Do not translate block templates or reference lists.
			return Promise.resolve( sourceHtml );
		}

		const { reducedDoc, extractedData } = this.sourceDoc.reduce();

		return this.translateHtml(
			sourceLang, targetLang, reducedDoc.getHtml()
		).then( ( translatedHTML ) => {
			const parser = new LinearDoc.Parser( new LinearDoc.MwContextualizer() );
			parser.init();
			parser.write( translatedHTML );
			const translatedDoc = parser.builder.doc;
			// Make sure that the translated document also has the same parent tag of this.sourceDoc
			// This catches the issue of the service sending the result in wrapped tags or even
			// as a full HTML document for an html fragment input.
			if ( translatedDoc.getRootItem().name !== this.sourceDoc.getRootItem().name ) {
				throw new Error(
					`Unexpected content in the translation for ${ sourceLang }>${ targetLang } using ${ this.constructor.name }`
				);
			}
			const targetDoc = translatedDoc.expand( extractedData );

			let translatedHtml = targetDoc.getHtml();
			if ( this.contentWrapped ) {
				translatedHtml = translatedHtml.replace( /^(<div>)([\s\S]*)(<\/div>)$/i, '$2' );
			}

			// Some clean up on the HTML for extra spaces. See T213694
			// Currently a known problem with Google MT client, but it is harmless to do this cleanup for all MT engines.
			// 1. Remove space before comma. Examples: "Word , word" or "<b>Word</b> , word"
			translatedHtml = translatedHtml.replace( / , /g, ', ' );
			// 2. Remove extra spaces. Examples: "Sentence.  New sentence" or "<span>Sentence.</sentence>  <span>Another sentence"
			translatedHtml = translatedHtml.replace( / {2}/g, ' ' );

			// Return sanitized HTML output
			const sanitizedResult = this.sanitize( translatedHtml );
			return sanitizedResult;
		} );
	}

	translateItemDeferred( item, sourceLang, targetLang ) {
		if ( item.type !== 'textblock' ) {
			return Promise.resolve( item );
		}

		const plainText = item.item.getPlainText();

		if ( plainText.trim() === '' ) {
			// No content to translate.
			return Promise.resolve( item );
		}

		return this.translateTextWithTagOffsets(
			sourceLang,
			targetLang,
			plainText,
			item.item.getTagOffsets()
		).then( ( translated ) => {
			const newTextBlock = item.item.translateTags( translated.text, translated.rangeMappings );

			return {
				type: 'textblock',
				item: newTextBlock
			};
		} );
	}

	/**
	 * Translate marked-up text
	 *
	 * @param {string} sourceLang Source language code
	 * @param {string} targetLang Target language code
	 * @param {string} sourceHtml Source html
	 * @return {Promise} Promise that resolves Translated html
	 */
	translateHtml( sourceLang, targetLang, sourceHtml ) {
		const chain = [];
		const isNonTranslatable = LinearDoc.Utils.isNonTranslatable;

		this.buildSourceDoc( sourceHtml );
		// Clone and adapt sourceDoc
		let targetDoc = new LinearDoc.Doc( this.sourceDoc.wrapperTag );
		let transclusionContext = null;
		let nonTranslatableContext = false;
		for ( let i = 0, len = this.sourceDoc.items.length; i < len; i++ ) {
			const item = this.sourceDoc.items[ i ];
			const tag = item.item;
			const about = cxUtil.getProp( [ 'item', 'attributes', 'about' ], item );

			if ( about && item.type === 'open' ) {
				// Start of transclusion context
				transclusionContext = about;
				nonTranslatableContext = true;
			}

			if ( isNonTranslatable( tag ) ) {
				// Do not translate content inside non translatable tags
				nonTranslatableContext = item.type === 'open';
			}

			if ( about === transclusionContext && item.type === 'close' ) {
				// End of transclusion context
				transclusionContext = null;
				nonTranslatableContext = false;
			}

			if ( item.type === 'textblock' ) {
				const rootItem = item.item.getRootItem();
				if ( rootItem && isNonTranslatable( rootItem ) ) {
					// Textblock is a transclusion. Do not translate.
					nonTranslatableContext = true;
				}
			}

			if ( nonTranslatableContext ) {
				// Do not machine translate content inside a transclusion context
				chain.push( Promise.resolve( this.sourceDoc.items[ i ] ) );
				continue;
			}

			chain.push(
				this.translateItemDeferred( this.sourceDoc.items[ i ], sourceLang, targetLang )
			);

		}

		return Promise.all( chain ).then( ( results ) => {
			targetDoc.items = results;
			if ( this.contentWrapped ) {
				// Unwrap
				targetDoc = targetDoc.items[ 1 ].item;
			}
			// Return sanitized HTML output
			return this.sanitize( targetDoc.getHtml() );
		} );
	}

	/**
	 * Sanitize given HTML using DOMPurify
	 *
	 * @param {string} html Dirty HTML
	 * @return {string} sanitized HTML output
	 */
	sanitize( html ) {
		if ( !this.DOMPurify ) {
		// Lazy initialize DOMPurify
			this.DOMPurify = createDOMPurify( ( new jsdom.JSDOM( '' ) ).window );
		}

		if ( !this.DOMPurify.isSupported ) {
			throw new Error( 'DOMPurify not suppported in the DOM environment provided by JSDOM' );
		}

		this.DOMPurify.addHook( 'beforeSanitizeAttributes', ( node ) => {
			if ( node.hasAttribute && node.hasAttribute( 'data-mw' ) ) {
				// See https://github.com/cure53/DOMPurify/issues/657
				const dataMw = node.getAttribute( 'data-mw' ).replace( 'br />', 'br>' );
				node.setAttribute( 'data-mw', dataMw );
			}
		} );

		const rdfaAttrs = [ 'about', 'rel', 'resource', 'property', 'content', 'datatype', 'typeof', 'srcset', 'encoding' ];
		return this.DOMPurify.sanitize( html, {
			// These are not known attributes for DOMPurify
			ADD_TAGS: [ 'link', 'semantics', 'annotation' ],
			ADD_ATTR: rdfaAttrs,
			ADD_URI_SAFE_ATTR: rdfaAttrs
		} );
	}

	/**
	 * Translate text, using case variants to map tag offsets
	 *
	 * @param {string} sourceLang Source language code
	 * @param {string} targetLang Target language code
	 * @param {string} sourceText Source plain text
	 * @param {Object[]} tagOffsets start and length for each annotation chunk
	 * @return {Object} Deferred promise: Translated plain text and range mappings
	 */
	translateTextWithTagOffsets( sourceLang, targetLang, sourceText, tagOffsets ) {
		const subSequences = this.getSubSequences( sourceLang, sourceText, tagOffsets );
		const sourceLines = subSequences.map( ( variant ) => variant.text );
		sourceLines.splice( 0, 0, sourceText );

		// Strip and store leading/trailing whitespace before sending text to MT server
		const preSpaces = [];
		const postSpaces = [];
		const trimmedSourceLines = [];
		for ( let i = 0; i < sourceLines.length; i++ ) {
			// Search for zero or more leading and trailing spaces. This will always match.
			let m = sourceLines[ i ].match( /^(\s*)([\s\S]*?)(\s*)$/ );
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
		return this.translateLines(
			sourceLang,
			targetLang,
			trimmedSourceLines
		).then( ( unnormalizedTargetLines ) => {
			let targetText, rangeMappings;

			// Restore leading/trailing whitespace from source
			const targetLines = unnormalizedTargetLines
				.map( ( line, i ) => preSpaces[ i ] + line.replace( /^\s+|\s+$/g, '' ) + postSpaces[ i ] );

			try {
				targetText = targetLines.splice( 0, 1 )[ 0 ];
				rangeMappings = this.getSequenceMappings(
					targetLang,
					subSequences,
					targetText,
					targetLines
				);
			} catch ( ex ) {
				// If annotation mapping fails for any reason, return translated text
				// without annotations.
				this.log( 'debug/mt', 'Error while mapping annotations ' + ex.stack );
				rangeMappings = {};
			}
			return {
				text: targetText,
				rangeMappings: rangeMappings
			};
		} );

	}

	/***
	 * Get the delimiter to use to combine text and subsequences(annotations) together
	 * for a single MT API request.
	 * @return {string}
	 */
	getDelimiter() {
		return '.॥॥.';
	}

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
	translateLines( sourceLang, targetLang, sourceLines ) {
		// Join lines into single string. Separator must break sentences and pass through unchanged
		// Using Devangari separator Double Danda twice.
		const sourceLinesText = sourceLines.join( this.getDelimiter() );

		return this.translateText(
			sourceLang,
			targetLang,
			sourceLinesText
		).then( ( targetLinesText ) => {
			// Populate the translation cache
			const translations = targetLinesText.split( this.getDelimiter() );
			for ( let i = 0; i < sourceLines.length; i++ ) {
				this.translationcache[ sourceLines[ i ].toLowerCase() ] = translations[ i ];
			}
			return translations;
		} );
	}

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
	getSubSequences( lang, sourceText, annotationOffsets ) {
		let offset;
		const subSequences = [];

		for ( let i = 0, len = annotationOffsets.length; i < len; i++ ) {
			offset = annotationOffsets[ i ];
			subSequences.push( {
				start: offset.start,
				length: offset.length,
				text: sourceText.slice( offset.start, offset.start + offset.length )
			} );
		}
		return subSequences;
	}

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
	isOverlappingRange( range, rangeArray ) {
		let start, end;
		const rangeStart = range.start,
			rangeEnd = range.start + range.length;

		for ( let i = 0; i < rangeArray.length; i++ ) {
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
	 * @return {number} Object.source.start {number} Start position of source subSequence
	 *   in the text.
	 * @return {number} Object.source.length {number} Length of source subSequence in the text.
	 * @return {number} Object.target.start {number} Start position of sequence in the text.
	 * @return {number} Object.target.length {number} Length of matched sequence in the text.
	 */
	getSequenceMappings( targetLang, subSequences, targetText, targetLines ) {
		let targetRange, sourceRange, subSequence;
		const rangeMappings = [],
			targetRanges = [],
			occurrences = {};

		if ( subSequences.length !== targetLines.length ) {
		// We must have translation for all subSequences.
			throw new Error( 'Translation variants length mismatch' );
		}

		for ( let i = 0, iLen = subSequences.length; i < iLen; i++ ) {
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

			if ( targetRange && !this.isOverlappingRange( targetRange, targetRanges ) ) {
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
	}

	/**
	 * Locate the given sequence in the translated text.
	 * Example:
	 *   Searching  'tropical' in 'They are subtropical and tropical flowers.', 'tropical',
	 *   returns { start: 12, length: 8 }
	 *
	 * @param {string} text The translated text.
	 * @param {string} sequence The search string.
	 * @param {string} language Language of the text. Used for language specific matching.
	 * @param {number} occurrence Pass 0 for first occurrence, 1 for second occurrence, so on.
	 * @return {null|Object} The location of the sequence in the text.
	 * @return {null|number} Object.start {number} Start position of sequence in the text.
	 * @return {null|number} Object.length Length of matched sequence in the text.
	 */
	findSubSequence( text, sequence, language, occurrence = 0 ) {
		const matcher = new SubSequenceMatcher( language ),
			indices = matcher.findFuzzyMatch( text, sequence );

		// Find the nth occurrence position
		if ( !indices || indices.length < occurrence ) {
			return null;
		}
		if ( occurrence === 0 ) {
			return matcher.bestMatch( indices );
		}
		return indices[ occurrence ];
	}

	/**
	 * Build the LinearDoc for the given source html
	 *
	 * @param {string} sourceHtml The html content
	 */
	buildSourceDoc( sourceHtml ) {
		if ( !sourceHtml ) {
			throw new Error( 'Invalid sourceHtml' );
		}

		const parser = new LinearDoc.Parser( new LinearDoc.MwContextualizer(), {
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
		if ( !this.sourceDoc || !this.sourceDoc.items.length ) {
			this.log( 'debug', 'Could not build a source doc. May be plain text? Re-attempting with <div> wrapper' );
			this.contentWrapped = true;
			this.buildSourceDoc( [ '<div>', sourceHtml, '</div>' ].join( '' ) );
		}
	}

	/**
	 * Whether this engine needs authentication with JWT
	 *
	 * @return {boolean}
	 */
	requiresAuthorization() {
		return false;
	}
}

module.exports = MTClient;
