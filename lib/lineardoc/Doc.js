'use strict';

const Utils = require( './Utils' );
const cxutil = require( './../util' );
const crypto = require( 'crypto' );

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
 */
class Doc {
	/**
	 *
	 * @param {string} wrapperTag open/close tags
	 */
	constructor( wrapperTag ) {
		this.items = [];
		this.wrapperTag = wrapperTag || null;
		this.categories = [];
	}

	/**
	 * Clone the Doc, modifying as we go
	 *
	 * @method
	 * @param {Function} callback The function to modify a node
	 * @return {Doc} clone with modifications
	 */
	clone( callback ) {
		var newDoc = new Doc( this.wrapperTag );
		for ( let i = 0, len = this.items.length; i < len; i++ ) {
			let item = this.items[ i ];
			let newItem = callback( item );
			newDoc.addItem( newItem.type, newItem.item );
		}
		return newDoc;
	}

	/**
	 * Add an item to the document
	 *
	 * @method
	 * @param {string} type Type of item: open|close|blockspace|textblock
	 * @param {Object|string|TextBlock} item Open/close tag, space or text block
	 * @return {Object}
	 * @chainable
	 */
	addItem( type, item ) {
		this.items.push( { type, item } );
		return this;
	}

	/**
	 * Remove the top item from the linear array of items
	 */
	undoAddItem() {
		this.items.pop();
	}

	/**
	 * Get the top item in the linear array of items
	 * @return {Object}
	 */
	getCurrentItem() {
		return this.items[ this.items.length - 1 ];
	}

	/**
	 * Segment the document into sentences
	 *
	 * @method
	 * @param {Function} getBoundaries Function taking plaintext, returning offset array
	 * @return {Doc} Segmented version of document TODO: warning: *shallow copied*.
	 */
	segment( getBoundaries ) {
		var newDoc = new Doc(),
			nextSectionId = 0,
			nextId = 0;

		// TODO: return different counters depending on type
		function getNextId( type, tagName ) {
			if ( tagName === 'section' ) {
				return String( `cxSourceSection${nextSectionId++}` );
			}
			if ( type === 'segment' || type === 'link' || type === 'block' ) {
				return String( nextId++ );
			} else {
				throw new Error( `Unknown ID type: ${type}` );
			}
		}

		for ( let i = 0, len = this.items.length; i < len; i++ ) {
			let item = this.items[ i ];
			if ( this.items[ i ].type === 'open' ) {
				let tag = Utils.cloneOpenTag( item.item );
				if ( tag.attributes.id ) {
					// If the item is a header, we make it a fixed length id using hash of
					// the text content. Header ids are originally the header text to get
					// the URL fragments working, but forCX, it is irrelevant and we need
					// a fixed length id that can be used as DB key.
					// The text inside this 'open tag' is in the next item(i+1).
					if ( [ 'h1', 'h2', 'h3', 'h4', 'h5' ].indexOf( tag.name ) >= 0 &&
						i + 1 < len &&
						this.items[ i + 1 ].type === 'textblock'
					) {
						let hash = crypto.createHash( 'sha256' );
						hash.update( this.items[ i + 1 ].item.getPlainText() );
						// 30 is the max length of ids we allow. We also prepend the sequence id
						// just to make sure the ids don't collide if the same text repeats.
						tag.attributes.id = hash.digest( 'hex' ).substr( 0, 30 );
					} else if ( tag.attributes.id.length > 30 ) {
						// At any case, make sure that the section id never exceeds 30 bytes
						tag.attributes.id = tag.attributes.id.substr( 0, 30 );
					}
				} else {
					tag.attributes.id = getNextId( 'block', tag.name );
				}
				newDoc.addItem( item.type, tag );
			} else if ( this.items[ i ].type !== 'textblock' ) {
				newDoc.addItem( item.type, item.item );
			} else {
				let textBlock = item.item;
				newDoc.addItem(
					'textblock',
					textBlock.canSegment ?
						textBlock.segment( getBoundaries, getNextId ) :
						textBlock.setLinkIds( getNextId )
				);
			}
		}
		return newDoc;
	}

	/**
	 * Dump an XML version of the linear representation, for debugging
	 *
	 * @method
	 * @return {string} XML version of the linear representation
	 */
	dumpXml() {
		return this.dumpXmlArray( '' ).join( '\n' );
	}

	/**
	 * Dump the document in HTML format
	 *
	 * @method
	 * @return {string} HTML document
	 */
	getHtml() {
		var tag, textblock,
			html = [];

		if ( this.wrapperTag ) {
			html.push( Utils.getOpenTagHtml( this.wrapperTag ) );
		}
		for ( let i = 0, len = this.items.length; i < len; i++ ) {
			let type = this.items[ i ].type;
			let item = this.items[ i ].item;

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
				let space = item;
				html.push( space );
			} else if ( type === 'textblock' ) {
				textblock = item;
				// textblock html list may be quite long, so concatenate now
				html.push( textblock.getHtml() );
			} else {
				throw new Error( `Unknown item type: ${type}` );
			}
		}
		if ( this.wrapperTag ) {
			html.push( Utils.getCloseTagHtml( this.wrapperTag ) );
		}
		return html.join( '' );
	}

	/**
	 * Wrap the content into sections
	 * See doc/SectionWrap.md for detailed documentaion.
	 * @method
	 * @return {string} HTML document
	 */
	wrapSections() {
		var newDoc = new Doc(),
			inBody = false,
			prevSection = null,
			currSection = null;

		// Copy the categories already collected.
		newDoc.categories = this.categories;

		/**
		 * For a given tag, get something that can be used to identify the tag.
		 * `about` attribute has more preference in our context since it connects
		 * template fragments. If `about` is not present, use id attribute.
		 * If no attributes, then it is tag name. In real wiki content, the case
		 * of no attributes is not found.
		 * @param {Object} tag
		 * @return {string}
		 */
		function getTagId( tag ) {
			let id;
			if ( tag.attributes ) {
				id = tag.attributes.about || tag.attributes.id;
			}
			return id || tag.name;
		}

		function openSection( doc ) {
			doc.addItem( 'open', { name: 'section', attributes: { rel: 'cx:Section' } } );
		}

		function closeSection( doc ) {
			doc.addItem( 'close', { name: 'section' } );
			prevSection = currSection;
			currSection = null;
		}

		function insertToPrevSection( item, doc ) {
			if ( newDoc.getCurrentItem().item.name !== 'section' ) {
				throw new Error( `Sectionwrap: Attempting to remove a non-section tag: ${item.name}` );
			}
			// Undo last section close
			doc.undoAddItem();
			currSection = prevSection;
			doc.addItem( item.type, item.item );
			closeSection( newDoc );
		}

		let itemsLength = this.items.length;
		for ( let i = 0; i < itemsLength; i++ ) {
			let item = this.items[ i ];
			let tag = item.item;
			let type = item.type;

			if ( !inBody ) {
				// Till we reach body, keep on adding items to newDoc.
				newDoc.addItem( type, tag );
				if ( tag.name === 'body' ) {
					inBody = true;
				}
				continue;
			}
			if ( type === 'open' ) {
				if ( !currSection ) {
					if ( prevSection === getTagId( tag ) ) {
						// This tag is connected to previous section. Can be a template fragement.
						// Undo last section close
						newDoc.undoAddItem();
						currSection = prevSection;
					} else {
						openSection( newDoc );
						currSection = getTagId( tag );
					}
				}
				newDoc.addItem( item.type, tag );
			} else if ( type === 'close' ) {
				if ( currSection && tag.name === 'body' ) {
					closeSection( newDoc );
					inBody = false;
				}

				newDoc.addItem( item.type, tag );
				if ( getTagId( tag ) === currSection ) {
					closeSection( newDoc );
				}

			} else if ( type === 'blockspace' ) {
				if ( prevSection && newDoc.getCurrentItem().item.name === 'section' ) {
					insertToPrevSection( item, newDoc );
				} else {
					newDoc.addItem( type, tag );
				}
			} else if ( type === 'textblock' ) {
				let textBlock = item.item;
				let tag = textBlock.getTagForId();

				if ( !tag && !currSection ) {
					// Textblock with no tag identifier. Add it to the previous section
					insertToPrevSection( item, newDoc );
					continue;
				}

				let isConnected = tag && prevSection === getTagId( tag );

				if ( isConnected ) {
					// This tag is connected to previous section. Can be a template fragement.
					insertToPrevSection( item, newDoc );
					continue;
				}

				if ( !currSection ) {
					openSection( newDoc );
					currSection = getTagId( tag );

					if ( tag.isSelfClosing ) {
						newDoc.addItem( item.type, textBlock );
						// If tag is self closing(Example: <meta>) close the section now itself.
						closeSection( newDoc );
						continue;
					}
				}

				newDoc.addItem( item.type, textBlock );
			} else {
				throw new Error( `Unknown item type: ${type}` );
			}
		}

		return newDoc;
	}

	/**
	 * Dump an XML Array version of the linear representation, for debugging
	 *
	 * @method
	 * @param {string} pad
	 * @return {string[]} Array that will concatenate to an XML string representation
	 */
	dumpXmlArray( pad ) {
		var tag, dump = [];

		if ( this.wrapperTag ) {
			dump.push( pad + '<cxwrapper>' );
		}
		for ( let i = 0, len = this.items.length; i < len; i++ ) {
			let type = this.items[ i ].type;
			let item = this.items[ i ].item;
			if ( type === 'open' ) {
				// open block tag
				tag = item;
				dump.push( `${pad}<${tag.name}>` );
				if ( tag.name === 'head' ) {
					// Add a few things for easy display
					dump.push( `${pad}<meta charset="UTF-8" />` );
					dump.push( `${pad}<style>cxtextblock { border: solid #88f 1px }` );
					dump.push( `${pad}cxtextchunk { border-right: solid #f88 1px }</style>` );
				}
			} else if ( type === 'close' ) {
				// close block tag
				tag = item;
				dump.push( `${pad}</${tag.name}>` );
			} else if ( type === 'blockspace' ) {
				// Non-inline whitespace
				dump.push( `${pad}<cxblockspace/>` );
			} else if ( type === 'textblock' ) {
				// Block of inline text
				let textBlock = item;
				dump.push( `${pad}<cxtextblock>` );
				dump.push.apply( dump, textBlock.dumpXmlArray( pad + '  ' ) );
				dump.push( `${pad}</cxtextblock>` );
			} else {
				throw new Error( `Unknown item type: ${type}` );
			}
		}
		if ( this.wrapperTag ) {
			dump.push( `${pad}</cxwrapper>` );
		}
		return dump;
	}

	/**
	 * Extract the text segments from the document
	 *
	 * @method
	 * @return {string[]} balanced html fragments, one per segment
	 */
	getSegments() {
		var segments = [];

		for ( let i = 0, len = this.items.length; i < len; i++ ) {
			if ( this.items[ i ].type !== 'textblock' ) {
				continue;
			}
			let textblock = this.items[ i ].item;
			segments.push( textblock.getHtml() );
		}

		return segments;
	}

	/**
	 * Reduce the document size by removing all attributes except id.
	 * This is derives a smaller HTML content to use with machine
	 * translation engines that support HTML. Using the #expand method,
	 * the attributes can be re-applied again.
	 *
	 * If id attribute in the reduced document is a generated id based
	 * on a counter.
	 *
	 * We assume that the MT engine preserve the HTML structure and id
	 * attributes while translating.
	 * @param {Object} [idCounter] The id sequence start value to use for the attribute dump
	 * @return {Object} Object containing reducedDoc and attrDump keys
	 *   attrDump is the extracted attributes from original doc. This is
	 *   required for #expand
	 */
	reduce( idCounter ) {
		const reducedDoc = new Doc( this.wrapperTag );
		let attrDump = {};
		idCounter = idCounter || { value: 0 };

		// Check if there are attributes other than id to save in attrDump
		const hasAttributesToSave = ( obj ) => {
			const keys = obj.attributes && Object.keys( obj.attributes );
			if ( !keys || keys.length === 0 ) { return false; }
			if ( keys.length > 1 ) { return true; }
			if ( keys[ 0 ] === 'id' ) { return false; }
			return true;
		};

		if ( this.wrapperTag && hasAttributesToSave( this.wrapperTag ) ) {
			idCounter.value++;
			attrDump[ idCounter.value ] = Object.assign( {}, this.wrapperTag.attributes );
			this.wrapperTag.attributes = { id: idCounter.value };
		}
		for ( let i = 0, len = this.items.length; i < len; i++ ) {
			let item = this.items[ i ];
			let tag = item.item;
			let type = item.type;

			if ( type === 'open' ) {
				if ( hasAttributesToSave( tag ) ) {
					idCounter.value++;
					attrDump[ idCounter.value ] = Object.assign( {}, tag.attributes ); // Shallow copy
					tag.attributes = { id: idCounter.value };
				}
				reducedDoc.addItem( type, tag );
				continue;
			}

			if ( type === 'close' || type === 'blockspace' ) {
				reducedDoc.addItem( type, tag );
				continue;
			}

			let textblock = tag;
			for ( let j = 0, len = textblock.textChunks.length; j < len; j++ ) {
				let chunk = textblock.textChunks[ j ];

				if ( chunk.tags ) {
					for ( let k = 0, len = chunk.tags.length; k < len; k++ ) {
						let tag = chunk.tags[ k ];
						if ( !hasAttributesToSave( tag ) ) {
							continue;
						}
						idCounter.value++;
						attrDump[ idCounter.value ] = Object.assign( {}, tag.attributes );
						tag.attributes = { id: idCounter.value };
					}
				}

				if ( chunk.inlineContent ) {
					if ( chunk.inlineContent.reduce ) {
						// Using object wrapping to pass counter by reference in order to avoid
						// re-using already used IDs when this function continues processing.
						let inlineReduceResult = chunk.inlineContent.reduce( idCounter );
						chunk.inlineContent = inlineReduceResult.reducedDoc;
						attrDump = Object.assign( attrDump, inlineReduceResult.attrDump );
					} else {
						if ( !hasAttributesToSave( chunk.inlineContent ) ) {
							continue;
						}
						idCounter.value++;
						attrDump[ idCounter.value ] = Object.assign( {}, chunk.inlineContent.attributes );
						chunk.inlineContent.attributes = { id: idCounter.value };
					}
				}
			}
			reducedDoc.addItem( type, tag );
		}

		return { reducedDoc, attrDump };
	}

	/**
	 * Expand a document with the given attrDump. The attributes based
	 * on the id of elements will be applied to the tags.
	 * @param {Object} attrDump The attributes that are extracted in #reduce method.
	 * @return {Doc} The expanded document.
	 */
	expand( attrDump ) {
		const expandedDoc = new Doc( this.wrapperTag );
		let id = 0;

		const hasAttributes = ( obj ) => obj.attributes && Object.keys( obj.attributes ).length;

		if ( this.wrapperTag && hasAttributes( this.wrapperTag ) ) {
			id = this.wrapperTag.attributes.id;
			if ( attrDump[ id ] ) { this.wrapperTag.attributes = attrDump[ id ]; }
		}
		for ( let i = 0, len = this.items.length; i < len; i++ ) {
			let item = this.items[ i ];
			let tag = item.item;
			let type = item.type;

			if ( type === 'open' ) {
				if ( hasAttributes( tag ) ) {
					id = tag.attributes.id;
					if ( attrDump[ id ] ) {
						tag.attributes = attrDump[ id ];
					} else {
						// Restore the id attribute alone, if exists.
						tag.attributes = id ? { id } : {};
					}
				}
				expandedDoc.addItem( type, tag );
				continue;
			}

			if ( type === 'close' || type === 'blockspace' ) {
				expandedDoc.addItem( type, tag );
				continue;
			}

			let textblock = tag;
			let expandedIds = [];
			for ( let j = 0, len = textblock.textChunks.length; j < len; j++ ) {
				let chunk = textblock.textChunks[ j ];

				if ( chunk.tags ) {
					for ( let k = 0, len = chunk.tags.length; k < len; k++ ) {
						let tag = chunk.tags[ k ];
						if ( !hasAttributes( tag ) ) {
							continue;
						}
						id = tag.attributes.id;

						if ( expandedIds.includes( id ) ) {
							// This is a close tag. Ignore
							continue;
						}

						if ( attrDump[ id ] ) {
							tag.attributes = attrDump[ id ];
							// This loop will see the closing tag for this tag too.
							// So keep track of open tags.
							expandedIds.push( tag.attributes.id );
						} else {
							// Restore the id attribute alone, if exists.
							tag.attributes = id ? { id } : {};
						}
					}
				}
				if ( chunk.inlineContent ) {
					if ( chunk.inlineContent.expand ) {
						chunk.inlineContent = chunk.inlineContent.expand( attrDump );
					} else {
						id = chunk.inlineContent.attributes.id;
						if ( attrDump[ id ] ) {
							chunk.inlineContent.attributes = attrDump[ id ];
						} else {
							chunk.inlineContent.attributes = id ? { id } : {};
						}
					}
				}
			}
			expandedDoc.addItem( type, tag );
		}

		return expandedDoc;
	}

}
/**
 * Recursively adapt all nodes in the document.
 *
 * @method
 * @param {Function} getAdapter Function taking a tag, returning adapted output
 * @return {Doc} Adapted version of document TODO: warning: *shallow copied*.
 */
Doc.prototype.adapt = cxutil.async( function* ( getAdapter ) {
	var adapter, newDoc = new Doc();

	if ( this.wrapperTag ) {
		adapter = getAdapter( this.wrapperTag );
		if ( adapter ) {
			newDoc = new Doc( yield adapter.adapt() );
		}
	}
	let transclusionContext = null;
	for ( let i = 0, len = this.items.length; i < len; i++ ) {
		let item = this.items[ i ];
		if ( this.items[ i ].type === 'open' ) {
			let tag = Utils.cloneOpenTag( item.item );
			if ( i + 1 < len && this.items[ i + 1 ].type === 'textblock' ) {
				tag.children = this.items[ i + 1 ].item;
			}
			adapter = getAdapter( tag );
			if ( adapter && !transclusionContext ) {
				// Do not adapt translation units under a transclusionContext
				newDoc.addItem( item.type, yield adapter.adapt() );
			} else {
				newDoc.addItem( item.type, tag );
			}
			let about = cxutil.getProp( [ 'attributes', 'about' ], tag );
			if ( about ) {
				transclusionContext = about;
			}
		} else if ( this.items[ i ].type === 'close' ) {
			let tag = item.item;
			let about = cxutil.getProp( [ 'attributes', 'about' ], tag );
			if ( about && about === transclusionContext ) {
				transclusionContext = null;
			}
			newDoc.addItem( item.type, item.item );
		} else if ( this.items[ i ].type !== 'textblock' ) {
			newDoc.addItem( item.type, item.item );
		} else {
			let textBlock = item.item;
			if ( !transclusionContext ) {
				// Do not adapt translation units under a transclusionContext
				newDoc.addItem(
					'textblock',
					yield textBlock.adapt( getAdapter )
				);
			} else {
				newDoc.addItem( item.type, item.item );
			}
		}
	}

	return newDoc;
} );

module.exports = Doc;
