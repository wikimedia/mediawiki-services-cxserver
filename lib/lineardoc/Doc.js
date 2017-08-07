'use strict';

var Utils = require( './Utils.js' ),
	cxutil = require( './../util.js' ),
	crypto = require( 'crypto' );

/**
 * An HTML document in linear representation.
 *
 * The document is a list of items, where each items is
 * - a block open tag (e.g. <p>); or
 * - a block close tag (e.g. </p>); or
 * - a TextBlock of annotated inline text; or
 * - "block whitespace" (a run of whitespace separating two block boundaries)
 *
 * Some types of HTML structure get normalized away. In particular:
 *
 * 1. Identical adjacent annotation tags are merged
 * 2. Inline annotations across block boundaries are split
 * 3. Annotations on block whitespace are stripped (except spans with 'data-mw')
 *
 * N.B. 2 can change semantics, e.g. identical adjacent links != single link
 *
 * @class
 *
 * @constructor
 *
 * @param {string} wrapperTag open/close tags
 */
function Doc( wrapperTag ) {
	this.items = [];
	this.wrapperTag = wrapperTag || null;
}

/**
 * Clone the Doc, modifying as we go
 *
 * @method
 * @param {Function} callback The function to modify a node
 * @return {Doc} clone with modifications
 */
Doc.prototype.clone = function ( callback ) {
	var i, len, item, newItem,
		newDoc = new Doc( this.wrapperTag );
	for ( i = 0, len = this.items.length; i < len; i++ ) {
		item = this.items[ i ];
		newItem = callback( item );
		newDoc.addItem( newItem.type, newItem.item );
	}
	return newDoc;
};

/**
 * Add an item to the document
 *
 * @method
 * @param {string} type Type of item: open|close|blockspace|textblock
 * @param {Object|string|TextBlock} item Open/close tag, space or text block
 * @return {Object}
 * @chainable
 */
Doc.prototype.addItem = function ( type, item ) {
	this.items.push( {
		type: type,
		item: item
	} );
	return this;
};

/**
 * Segment the document into sentences
 *
 * @method
 * @param {Function} getBoundaries Function taking plaintext, returning offset array
 * @return {Doc} Segmented version of document TODO: warning: *shallow copied*.
 */
Doc.prototype.segment = function ( getBoundaries ) {
	var i, len, item, tag, textBlock, hash,
		newDoc = new Doc(),
		nextId = 0;

	// TODO: return different counters depending on type
	function getNextId( type ) {
		if ( type === 'segment' || type === 'link' || type === 'block' ) {
			return String( nextId++ );
		} else {
			throw new Error( 'Unknown ID type: ' + type );
		}
	}

	for ( i = 0, len = this.items.length; i < len; i++ ) {
		item = this.items[ i ];
		if ( this.items[ i ].type === 'open' ) {
			tag = Utils.cloneOpenTag( item.item );
			if ( tag.attributes.id ) {
				// If the item is a header, we make it a fixed length id using hash of the text content.
				// Header ids are originally the header text to get the URL fragments working, but for
				// CX, it is irrelevant and we need a fixed length id that can be used as DB key.
				// The text inside this 'open tag' is in the next item(i+1).
				if ( [ 'h1', 'h2', 'h3', 'h4', 'h5' ].indexOf( tag.name ) >= 0 &&
					i + 1 < len &&
					this.items[ i + 1 ].type === 'textblock'
				) {
					hash = crypto.createHash( 'sha256' );
					hash.update( this.items[ i + 1 ].item.getPlainText() );
					// 30 is the max length of ids we allow. We also prepend the sequence id
					// just to make sure the ids don't collide if the same text repeats.
					tag.attributes.id = (
						tag.attributes[ 'data-seqid' ] + hash.digest( 'hex' )
					).substr( 0, 30 );
				} else if ( tag.attributes.id.length > 30 ) {
					// At any case, make sure that the section id never exceeds 30 bytes
					tag.attributes.id = (
						tag.attributes[ 'data-seqid' ] + tag.attributes.id
					).substr( 0, 30 );
				}
			} else {
				tag.attributes.id = getNextId( 'block' );
			}
			newDoc.addItem( item.type, tag );
		} else if ( this.items[ i ].type !== 'textblock' ) {
			newDoc.addItem( item.type, item.item );
		} else {
			textBlock = item.item;
			newDoc.addItem(
				'textblock',
				textBlock.segment( getBoundaries, getNextId )
			);
		}
	}
	return newDoc;
};

/**
 * Dump an XML version of the linear representation, for debugging
 *
 * @method
 * @return {string} XML version of the linear representation
 */
Doc.prototype.dumpXml = function () {
	return this.dumpXmlArray( '' ).join( '\n' );
};

/**
 * Dump the document in HTML format
 *
 * @method
 * @return {string} HTML document
 */
Doc.prototype.getHtml = function () {
	var i, len, type, item, tag, space, textblock,
		html = [];
	if ( this.wrapperTag ) {
		html.push( Utils.getOpenTagHtml( this.wrapperTag ) );
	}
	for ( i = 0, len = this.items.length; i < len; i++ ) {
		type = this.items[ i ].type;
		item = this.items[ i ].item;

		if ( item.attributes && item.attributes.class === 'cx-segment-block' ) {
			continue;
		}

		if ( type === 'open' ) {
			tag = item;
			html.push( Utils.getOpenTagHtml( tag ) );
		} else if ( type === 'close' ) {
			tag = item;
			html.push( Utils.getCloseTagHtml( tag ) );
		} else if ( type === 'blockspace' ) {
			space = item;
			html.push( space );
		} else if ( type === 'textblock' ) {
			textblock = item;
			// textblock html list may be quite long, so concatenate now
			html.push( textblock.getHtml() );
		} else {
			throw new Error( 'Unknown item type: ' + type );
		}
	}
	if ( this.wrapperTag ) {
		html.push( Utils.getCloseTagHtml( this.wrapperTag ) );
	}
	return html.join( '' );
};

/**
 * Dump an XML Array version of the linear representation, for debugging
 *
 * @method
 * @param {string} pad
 * @return {string[]} Array that will concatenate to an XML string representation
 */
Doc.prototype.dumpXmlArray = function ( pad ) {
	var i, len, type, item, tag, textBlock,
		dump = [];
	if ( this.wrapperTag ) {
		dump.push( pad + '<cxwrapper>' );
	}
	for ( i = 0, len = this.items.length; i < len; i++ ) {
		type = this.items[ i ].type;
		item = this.items[ i ].item;
		if ( type === 'open' ) {
			// open block tag
			tag = item;
			dump.push( pad + '<' + tag.name + '>' );
			if ( tag.name === 'head' ) {
				// Add a few things for easy display
				dump.push( pad + '<meta charset="UTF-8" />' );
				dump.push( pad + '<style>cxtextblock { border: solid #88f 1px }' );
				dump.push( pad + 'cxtextchunk { border-right: solid #f88 1px }</style>' );
			}
		} else if ( type === 'close' ) {
			// close block tag
			tag = item;
			dump.push( pad + '</' + tag.name + '>' );
		} else if ( type === 'blockspace' ) {
			// Non-inline whitespace
			dump.push( pad + '<cxblockspace/>' );
		} else if ( type === 'textblock' ) {
			// Block of inline text
			textBlock = item;
			dump.push( pad + '<cxtextblock>' );
			dump.push.apply( dump, textBlock.dumpXmlArray( pad + '  ' ) );
			dump.push( pad + '</cxtextblock>' );
		} else {
			throw new Error( 'Unknown item type: ' + type );
		}
	}
	if ( this.wrapperTag ) {
		dump.push( pad + '</cxwrapper>' );
	}
	return dump;
};

/**
 * Extract the text segments from the document
 *
 * @method
 * @return {string[]} balanced html fragments, one per segment
 */
Doc.prototype.getSegments = function () {
	var i, len, textblock,
		segments = [];
	for ( i = 0, len = this.items.length; i < len; i++ ) {
		if ( this.items[ i ].type !== 'textblock' ) {
			continue;
		}
		textblock = this.items[ i ].item;
		segments.push( textblock.getHtml() );
	}
	return segments;
};

/**
 * Segment the document into sentences
 *
 * @method
 * @param {Function} getAdapter Function taking a tag, returning adapted output
 * @return {Doc} Segmented version of document TODO: warning: *shallow copied*.
 */
Doc.prototype.adapt = cxutil.async( function* ( getAdapter ) {
	var i, len, item, tag, textBlock, adapter,
		newDoc = new Doc();

	if ( this.wrapperTag ) {
		adapter = getAdapter( this.wrapperTag );
		if ( adapter ) {
			newDoc = new Doc( yield adapter.adapt() );
		}
	}
	for ( i = 0, len = this.items.length; i < len; i++ ) {
		item = this.items[ i ];
		if ( this.items[ i ].type === 'open' ) {
			tag = Utils.cloneOpenTag( item.item );
			if ( i + 1 < len && this.items[ i + 1 ].type === 'textblock' ) {
				tag.children = this.items[ i + 1 ].item;
			}
			adapter = getAdapter( tag );
			if ( adapter ) {
				newDoc.addItem( item.type, yield adapter.adapt() );
			} else {
				newDoc.addItem( item.type, tag );
			}
		} else if ( this.items[ i ].type !== 'textblock' ) {
			newDoc.addItem( item.type, item.item );
		} else {
			textBlock = item.item;
			newDoc.addItem(
				'textblock',
				yield textBlock.adapt( getAdapter )
			);
		}
	}
	return newDoc;
} );

module.exports = Doc;
