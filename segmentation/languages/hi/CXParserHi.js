'use strict';

var CXParser = require( __dirname + '/../CXParser' ),
	util = require( 'util' );

function CXParserHi() {
	CXParser.call( this, false, {
		lowercase: true
	} );
}

util.inherits( CXParserHi, CXParser );

CXParserHi.prototype.ontext = function ( text ) {
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
		replacement += parser.endSentence();
		replacement += parser.startSentence();
		return replacement;
	}
	text = text.replace( /([a-zA-Zअ-ह]*)([।!?][\s])/g, textSplit );
	// content terminating with [.|!|?]. But defer the decision of sentence break
	// to handle cases like: "Hydrogen is a gas.[1] It is an..". References part of
	// the sentence appear after the period.
	text = text.replace( /([.!?])$/, function ( match, p1 ) {
		parser.sawSentenceEndCandidate = true;
		return p1;
	} );
	this.print( text );
};

module.exports = CXParserHi;
