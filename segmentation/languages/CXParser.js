'use strict';

var SAXParser = require( 'sax' ).SAXParser,
	util = require( 'util' );

/**
 * @class CXParser
 */
function CXParser() {
	SAXParser.call( this, false, {
		lowercase: true
	} );
}

util.inherits( CXParser, SAXParser );

/**
 * Initialize the parser
 */
CXParser.prototype.init = function () {
	this.segmentCount = 0;
	this.segmentedContent = '';
	this.inSentence = false;
	this.links = {};
};

CXParser.prototype.sectionTypes = [
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
	'map', 'object', 'pre', 'progress', 'video'
 ];
/**
 * Error handler
 */
CXParser.prototype.onerror = function ( error ) {
	console.error( error );
	throw error;
};

/**
 * Parse the content
 * @param {string} content
 */
CXParser.prototype.parse = function ( content ) {
	this.init();
	this.write( content );
};

/**
 * Collects the content to segmentedContent
 * @param {string} content
 */
CXParser.prototype.print = function ( content ) {
	this.segmentedContent += content;
};

/**
 * Entity handler
 */
function entity( str ) {
	return str.replace( /["'&<>]/g, function ( ch ) {
		return '&#' + ch.charCodeAt( 0 ) + ';';
	} );
}

/**
 * Start a sentence - add sentence segment marker
 */
CXParser.prototype.startSentence = function () {
	this.inSentence = true;
	this.sawSentenceEndCandidate = false;
	return '\n\t<span class="cx-segment" data-segmentid="' + ( this.segmentCount++ ) + '">';
};

/**
 * End a sentence - add sentence segment marker
 */
CXParser.prototype.endSentence = function () {
	this.inSentence = false;
	return '</span>';
};

/**
 * Undo end a sentence
 */
CXParser.prototype.undoEndSentence = function () {
	this.inSentence = true;
	this.segmentedContent = this.segmentedContent.substr( 0, this.segmentedContent.length - 7 );
};

/**
 * Text handler
 * @param {string} text
 */
CXParser.prototype.ontext = function ( text ) {
	var parser = this;

	if ( !text.trim() ) {
		return;
	}
	if ( !this.inSentence ) {
		// Avoid dangling sentence.
		this.print( this.startSentence() );
	}

	function textSplit( match, prevWord, sentenceSeparator, offset, sentence ) {
		var replacement, nextLetter;

		replacement = prevWord + sentenceSeparator;
		nextLetter = sentence[ offset + match.length ];
		if ( prevWord && prevWord.length < 3 && prevWord[ 0 ].toUpperCase() === prevWord[ 0 ] ||
			nextLetter && nextLetter.toLowerCase() === nextLetter ) {
			// abbreviation?
			return replacement;
		}
		replacement += parser.endSentence();
		replacement += parser.startSentence();
		return replacement;
	}

	text = text.replace( /(\w*)([.!?][\s])/g, textSplit );
	// content terminating with [.|!|?]. But defer the decision of sentence break
	// to handle cases like: "Hydrogen is a gas.[1] It is an..". References part of
	// the sentence appear after the period.
	text = text.replace( /([.!?])$/, function ( match, p1 ) {
		parser.sawSentenceEndCandidate = true;
		return p1;
	} );
	this.print( text );
};

/**
 * Link Handler
 * @param {string} href
 */
CXParser.prototype.linkHandler = function ( href ) {
	if ( !this.inSentence ) {
		this.print( this.startSentence() );
	}
	this.links[ this.segmentCount ] = {
		href: href
	};
	this.print( ' class="cx-link" data-linkid="' + ( this.segmentCount++ ) + '"' );
};

/**
 * Open tag event handler
 * @param {Object} tag
 */
CXParser.prototype.onopentag = function ( tag ) {
	var attrName;

	if ( this.sectionTypes.indexOf( tag.name ) >= 0 ) {
		if ( this.inSentence ) {
			// Avoid dangling sentence.
			this.print( this.endSentence() );
		}
	}

	if ( tag.name === 'a' && !this.inSentence ) {
		// sentences starting with a link
		this.print( this.startSentence() );
	}

	if ( this.sawSentenceEndCandidate ) {
		if ( tag.name === 'span' &&
			tag.attributes.class === 'reference' && ( this.inSentence || this.inReference ) && this.sawSentenceEndCandidate ) {
			// Sentences staring with reference links.
			// Example: Sentence one.[1] Sentence two
			// Here [1] is not part of Sentence two. It is reference for Sentence one.
			// It is also possible to have this references repeated n times
			// Example: Sentence one.[1][2][3][4] Sentence two
			if ( this.inReference ) {
				// This is already in Reference state. That means, this is a
				// case of multiple references. We need to remove the last sentence close
				this.inSentence = true;
				this.undoEndSentence();
			}
			this.inReference = true;
		}

		// Check if we need to reset inReference state. References contains an 'a' tag
		// inside 'span' tag
		if ( this.inReference && !( tag.name === 'a' || tag.name === 'span' ) ) {
			// Reset inReference
			this.inReference = false;
			this.sawSentenceEndCandidate = false;
		}
	}
	// Start of tag
	this.print( '<' + tag.name );

	if ( tag.name === 'a' ) {
		this.linkHandler( tag.attributes.href );
	}

	for ( attrName in tag.attributes ) {
		this.print( ' ' + attrName + '="' + entity( tag.attributes[ attrName ] ) + '"' );
	}

	// Sections
	if ( this.sectionTypes.indexOf( tag.name ) >= 0 ) {
		if ( !tag.attributes.id ) {
			this.print( ' id="' + ( this.segmentCount++ ) + '"' );
		}
	}

	// Close the tag
	this.print( '>' );

	// Start the first segment of the section
	if ( this.sectionTypes.indexOf( tag.name ) >= 0 ) {
		this.print( this.startSentence() );
	}
};

/**
 * Close tag handler
 * @param {string} tag
 */
CXParser.prototype.onclosetag = function ( tag ) {
	if ( this.sectionTypes.indexOf( tag ) >= 0 ) {
		if ( this.inSentence ) {
			// Avoid dangling sentence.
			this.print( this.endSentence() );
		}
		this.print( '</' + tag + '>\n' );
	} else {
		this.print( '</' + tag + '>' );
	}
	// See if we have to print the left over </span>
	// from reference handling
	if ( tag === 'span' && this.inReference && this.sawSentenceEndCandidate ) {
		this.print( this.endSentence() );
	}
};

module.exports = CXParser;
