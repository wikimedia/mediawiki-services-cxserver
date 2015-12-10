'use strict';

var SAXParser = require( 'sax' ).SAXParser,
	util = require( 'util' ),
	Utils =  require( './Utils.js' );

/**
 * Escape text for inclusion in HTML, not inside a tag.
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
 * Parser to normalize XML.
 *
 * @class
 * @constructor
 */
function Normalizer() {
	SAXParser.call( this, false, {
		lowercase: true
	} );
}
util.inherits( Normalizer, SAXParser );

Normalizer.prototype.init = function () {
	this.doc = [];
	this.tags = [];
};

Normalizer.prototype.onopentag = function ( tag ) {
	this.tags.push( tag );
	this.doc.push( Utils.getOpenTagHtml( tag ) );
};

Normalizer.prototype.onclosetag = function ( tagName ) {
	var tag = this.tags.pop();
	if ( tag.name !== tagName ) {
		throw new Error( 'Unmatched tags: ' + tag.name + ' !== ' + tagName );
	}
	this.doc.push( Utils.getCloseTagHtml( tag ) );
};

Normalizer.prototype.ontext = function ( text ) {
	this.doc.push( esc( text ) );
};

Normalizer.prototype.getHtml = function () {
	return this.doc.join( '' );
};

module.exports = Normalizer;
