'use strict';

const SAXParser = require( 'sax' ).SAXParser;
const Utils = require( './Utils' );

/**
 * Escape text for inclusion in HTML, not inside a tag.
 *
 * @private
 * @param {string} str String to escape
 * @return {string} Escaped version of the string
 */
function esc( str ) {
	return str.replace( /[&<>]/g, ( ch ) => '&#' + ch.charCodeAt( 0 ) + ';' );
}

/**
 * Parser to normalize XML.
 *
 * @class
 * @constructor
 */
class Normalizer extends SAXParser {
	constructor() {
		super( false, {
			lowercase: true
		} );
	}

	init() {
		this.doc = [];
		this.tags = [];
	}

	onopentag( tag ) {
		this.tags.push( tag );
		this.doc.push( Utils.getOpenTagHtml( tag ) );
	}

	onclosetag( tagName ) {
		const tag = this.tags.pop();
		if ( tag.name !== tagName ) {
			throw new Error( 'Unmatched tags: ' + tag.name + ' !== ' + tagName );
		}
		this.doc.push( Utils.getCloseTagHtml( tag ) );
	}

	ontext( text ) {
		this.doc.push( esc( text ) );
	}

	getHtml() {
		return this.doc.join( '' );
	}

}

module.exports = Normalizer;
