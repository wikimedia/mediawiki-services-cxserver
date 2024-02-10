'use strict';

/**
 * @external TextBlock
 */

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
		const newDoc = new Doc( this.wrapperTag );
		for ( let i = 0, len = this.items.length; i < len; i++ ) {
			const item = this.items[ i ];
			const newItem = callback( item );
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
	 *
	 * @return {Object}
	 */
	getCurrentItem() {
		return this.items[ this.items.length - 1 ];
	}

	/**
	 * Get the root item in the doc. Since doc is a linear representation
	 * of DOM tree, the root item is the first item in the doc, skipping
	 * any blockspaces.
	 *
	 * @return {Object}
	 */
	getRootItem() {
		if ( this.wrapperTag ) {
			return this.wrapperTag;
		}
		for ( let i = 0; i < this.items.length; i++ ) {
			// Ignore all blockspaces, loop till we see a tag opening
			if ( this.items[ i ].type === 'open' ) {
				return this.items[ i ].item;
			}
		}
	}

	/**
	 * Segment the document into sentences
	 *
	 * @method
	 * @param {Function} getBoundaries Function taking plaintext, returning offset array
	 * @return {Doc} Segmented version of document TODO: warning: *shallow copied*.
	 */
	segment( getBoundaries ) {
		const newDoc = new Doc();
		let nextSectionId = 0,
			nextId = 0,
			sectionNumber = 0;

		// TODO: return different counters depending on type
		function getNextId( type, tagName ) {
			if ( tagName === 'section' ) {
				return String( `cxSourceSection${ nextSectionId++ }` );
			}
			if ( type === 'segment' || type === 'link' || type === 'block' ) {
				return String( nextId++ );
			} else {
				throw new Error( `Unknown ID type: ${ type }` );
			}
		}

		let transclusionContext = null;
		for ( let i = 0, len = this.items.length; i < len; i++ ) {
			const item = this.items[ i ];
			if ( this.items[ i ].type === 'open' ) {
				const tag = Utils.cloneOpenTag( item.item );
				if ( tag.attributes.id ) {
					// If the item is a header, we make it a fixed length id using hash of
					// the text content. Header ids are originally the header text to get
					// the URL fragments working, but for CX, it is irrelevant and we need
					// a fixed length id that can be used as DB key.
					// The text inside this 'open tag' is in the next item(i+1).
					if ( [ 'h1', 'h2', 'h3', 'h4', 'h5' ].includes( tag.name ) &&
						i + 1 < len &&
						this.items[ i + 1 ].type === 'textblock'
					) {
						const hash = crypto.createHash( 'sha256' );
						hash.update( this.items[ i + 1 ].item.getPlainText() );
						// 30 is the max length of ids we allow. We also prepend the sequence id
						// just to make sure the ids don't collide if the same text repeats.
						tag.attributes.id = hash.digest( 'hex' ).slice( 0, 30 );
					} else if ( tag.attributes.id.length > 30 ) {
						// At any case, make sure that the section id never exceeds 30 bytes
						tag.attributes.id = tag.attributes.id.slice( 0, 30 );
					}
				} else {
					tag.attributes.id = getNextId( 'block', tag.name );
					// Section headers (<h2> tags) mark the start of a new section
					if ( i + 1 < len && this.items[ i + 1 ].item.name === 'h2' ) {
						sectionNumber++;
					}
				}
				if ( tag.name === 'section' ) {
					tag.attributes[ 'data-mw-section-number' ] = sectionNumber;
				}
				newDoc.addItem( item.type, tag );
				// Content of tags that are either mw:Transclusion or mw:Extension need not be segmented.
				const about = cxutil.getProp( [ 'attributes', 'about' ], tag );
				const typeOf = cxutil.getProp( [ 'attributes', 'typeof' ], tag );
				if ( about && typeOf ) {
					transclusionContext = about;
				}
			} else if ( this.items[ i ].type === 'close' ) {
				const tag = item.item;
				const about = cxutil.getProp( [ 'attributes', 'about' ], tag );
				if ( about && about === transclusionContext ) {
					transclusionContext = null;
				}
				newDoc.addItem( item.type, item.item );
			} else if ( this.items[ i ].type !== 'textblock' ) {
				newDoc.addItem( item.type, item.item );
			} else {
				const textBlock = item.item;
				newDoc.addItem(
					'textblock',
					textBlock.canSegment && !transclusionContext ?
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
		const html = [];

		if ( this.wrapperTag ) {
			html.push( Utils.getOpenTagHtml( this.wrapperTag ) );
		}
		for ( let i = 0, len = this.items.length; i < len; i++ ) {
			const type = this.items[ i ].type;
			const item = this.items[ i ].item;

			if ( item.attributes && item.attributes.class === 'cx-segment-block' ) {
				continue;
			}

			if ( type === 'open' ) {
				const tag = item;
				html.push( Utils.getOpenTagHtml( tag ) );
			} else if ( type === 'close' ) {
				const tag = item;
				html.push( Utils.getCloseTagHtml( tag ) );
			} else if ( type === 'blockspace' ) {
				const space = item;
				html.push( space );
			} else if ( type === 'textblock' ) {
				const textblock = item;
				// textblock html list may be quite long, so concatenate now
				html.push( textblock.getHtml() );
			} else {
				throw new Error( `Unknown item type: ${ type }` );
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
	 *
	 * @method
	 * @return {string} HTML document
	 */
	wrapSections() {
		const newDoc = new Doc();
		let inBody = false,
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
		 *
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
				throw new Error( `Sectionwrap: Attempting to remove a non-section tag: ${ item.name }` );
			}
			// Undo last section close
			doc.undoAddItem();
			currSection = prevSection;
			doc.addItem( item.type, item.item );
			closeSection( newDoc );
		}

		const itemsLength = this.items.length;
		for ( let i = 0; i < itemsLength; i++ ) {
			const item = this.items[ i ];
			const tag = item.item;
			const type = item.type;

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
						// This tag is connected to previous section. Can be a template fragment.
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
				const textBlock = item.item;
				const tagForId = textBlock.getTagForId();

				if ( !tagForId && !currSection ) {
					// Textblock with no tag identifier. Add it to the previous section
					insertToPrevSection( item, newDoc );
					continue;
				}

				const isConnected = tagForId && prevSection === getTagId( tagForId );

				if ( isConnected ) {
					// This tag is connected to previous section. Can be a template fragment.
					insertToPrevSection( item, newDoc );
					continue;
				}

				if ( !currSection ) {
					openSection( newDoc );
					currSection = getTagId( tagForId );
					if ( !currSection ) {
						throw new Error( `No id for the opened section for tag ${ tagForId.name }` );
					}
					newDoc.addItem( item.type, textBlock );
					// There was no open sections. Close the section now itself. If this tag is a template
					// fragment, `isConnected` check above will insert the fragments to closed section.
					closeSection( newDoc );
					continue;
				}

				newDoc.addItem( item.type, textBlock );
			} else {
				throw new Error( `Unknown item type: ${ type }` );
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
		const dump = [];

		if ( this.wrapperTag ) {
			dump.push( `${ pad }<cxwrapper>` );
		}
		for ( let i = 0, len = this.items.length; i < len; i++ ) {
			const type = this.items[ i ].type;
			const item = this.items[ i ].item;
			if ( type === 'open' ) {
				// open block tag
				const tag = item;
				dump.push( `${ pad }<${ tag.name }>` );
				if ( tag.name === 'head' ) {
					// Add a few things for easy display
					dump.push( `${ pad }<meta charset="UTF-8" />` );
					dump.push( `${ pad }<style>cxtextblock { border: solid #88f 1px }` );
					dump.push( `${ pad }cxtextchunk { border-right: solid #f88 1px }</style>` );
				}
			} else if ( type === 'close' ) {
				// close block tag
				const tag = item;
				dump.push( `${ pad }</${ tag.name }>` );
			} else if ( type === 'blockspace' ) {
				// Non-inline whitespace
				dump.push( `${ pad }<cxblockspace/>` );
			} else if ( type === 'textblock' ) {
				// Block of inline text
				const textBlock = item;
				dump.push( `${ pad }<cxtextblock>` );
				dump.push.apply( dump, textBlock.dumpXmlArray( pad + '  ' ) );
				dump.push( `${ pad }</cxtextblock>` );
			} else {
				throw new Error( `Unknown item type: ${ type }` );
			}
		}
		if ( this.wrapperTag ) {
			dump.push( `${ pad }</cxwrapper>` );
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
		const segments = [];

		for ( let i = 0, len = this.items.length; i < len; i++ ) {
			if ( this.items[ i ].type !== 'textblock' ) {
				continue;
			}
			const textblock = this.items[ i ].item;
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
	 *
	 * @param {Object} [idCounter] The id sequence start value to use for the attribute dump
	 * @return {Object} Object containing reducedDoc and extracted data that contains
	 *   attributes and content from original doc. This is required for #expand
	 */
	reduce( idCounter ) {
		const reducedDoc = new Doc( this.wrapperTag );
		let extractedData = {};
		idCounter = idCounter || { value: 0 };

		// Check if the tag need to be translated by an MT service.
		// If not, the translation from MT service won't be accepted.
		const isNonTranslatable = Utils.isNonTranslatable;
		let nonTranslatableContext = false;

		// Check if there are attributes other than id to save in attrDump
		const hasAttributesToSave = ( obj ) => {
			const keys = obj.attributes && Object.keys( obj.attributes );
			if ( !keys || keys.length === 0 ) {
				return false;
			}
			if ( keys.length > 1 ) {
				return true;
			}
			if ( keys[ 0 ] === 'id' ) {
				return false;
			}
			return true;
		};

		if ( this.wrapperTag && hasAttributesToSave( this.wrapperTag ) ) {
			idCounter.value++;
			extractedData[ idCounter.value ] = {
				attributes: Object.assign( {}, this.wrapperTag.attributes )
			};

			if ( Utils.isMath( this.wrapperTag ) ) {
				// Do not send inline mw:Extention/math content to MT engines
				// since they are known to mangle the content.
				// Save the (inline) document in extractedData, return the document
				// wrapper tag alone.
				extractedData[ idCounter.value ].document = this;
				this.wrapperTag.attributes.id = idCounter.value;
				return { reducedDoc, extractedData };
			}
			this.wrapperTag.attributes = { id: idCounter.value };
		}
		for ( let i = 0, iLen = this.items.length; i < iLen; i++ ) {
			const item = this.items[ i ];
			const tag = item.item;
			const type = item.type;

			if ( type === 'open' ) {
				const hasAttributes = hasAttributesToSave( tag );
				const hasNonTranslatableContent = isNonTranslatable( tag );
				if ( hasAttributes || hasNonTranslatableContent ) {
					idCounter.value++;

					if ( hasAttributes ) {
						extractedData[ idCounter.value ] = {
							attributes: Object.assign( {}, tag.attributes ) // Shallow copy
						};
					}

					const originalAttrs = tag.attributes;
					tag.attributes = { id: idCounter.value };

					// Preserve rdfa attributes in the reduced doc so that when parsing
					// the output from MT systems, we don't remove spans with empty content
					// See Builder#popInlineAnnotationTag
					if ( originalAttrs.typeof && originalAttrs.about ) {
						tag.attributes.typeof = originalAttrs.typeof;
						tag.attributes.about = originalAttrs.about;
					}
					// Set a flag to indicate that textblocks should be extracted out
					if ( hasNonTranslatableContent ) {
						nonTranslatableContext = true;
					}
				}
				reducedDoc.addItem( type, tag );
				continue;
			}

			if ( type === 'close' || type === 'blockspace' ) {
				reducedDoc.addItem( type, tag );
				if ( isNonTranslatable( tag ) ) {
					nonTranslatableContext = false;
				}
				continue;
			}

			const textblock = tag;
			if ( nonTranslatableContext ) {
				extractedData[ idCounter.value ] = Object.assign(
					extractedData[ idCounter.value ] || {}, { content: textblock }
				);
				continue;
			}
			for ( let j = 0, jLen = textblock.textChunks.length; j < jLen; j++ ) {
				const chunk = textblock.textChunks[ j ];

				if ( chunk.tags ) {
					for ( let k = 0, kLen = chunk.tags.length; k < kLen; k++ ) {
						const chunkTag = chunk.tags[ k ];
						if ( !hasAttributesToSave( chunkTag ) ) {
							continue;
						}
						idCounter.value++;
						const originalTag = Object.assign( {}, chunkTag );
						extractedData[ idCounter.value ] = {
							attributes: Object.assign( {}, chunkTag.attributes )
						};
						chunkTag.attributes = { id: idCounter.value };

						if ( isNonTranslatable( originalTag ) ) {
							extractedData[ idCounter.value ] = Object.assign(
								extractedData[ idCounter.value ] || {}, { content: chunk.text }
							);
						}
					}
				}

				if ( chunk.inlineContent ) {
					if ( chunk.inlineContent.reduce ) {
						// Using object wrapping to pass counter by reference in order to avoid
						// re-using already used IDs when this function continues processing.
						const inlineReduceResult = chunk.inlineContent.reduce( idCounter );
						chunk.inlineContent = inlineReduceResult.reducedDoc;
						extractedData = Object.assign( extractedData, inlineReduceResult.extractedData );
					} else {
						if ( !hasAttributesToSave( chunk.inlineContent ) ) {
							continue;
						}
						idCounter.value++;
						extractedData[ idCounter.value ] = {
							attributes: Object.assign( {}, chunk.inlineContent.attributes )
						};
						chunk.inlineContent.attributes = { id: idCounter.value };
					}
				}
			}
			reducedDoc.addItem( type, tag );
		}

		return { reducedDoc, extractedData };
	}

	/**
	 * Expand a document with the given attrDump. The attributes based
	 * on the id of elements will be applied to the tags.
	 *
	 * @param {Object} extractedData The extracted data in #reduce method
	 * @return {Doc} The expanded document.
	 */
	expand( extractedData ) {
		const expandedDoc = new Doc( this.wrapperTag );
		let id = 0;

		const hasAttributes = ( obj ) => obj.attributes && Object.keys( obj.attributes ).length;
		if ( this.wrapperTag && hasAttributes( this.wrapperTag ) ) {
			id = this.wrapperTag.attributes.id;
			if ( extractedData[ id ] ) {
				if ( extractedData[ id ].document ) {
					// The inline document is extracted as a whole. Return it.
					// This happens for mw:Extension/math.
					return extractedData[ id ].document;
				}
				this.wrapperTag.attributes = extractedData[ id ].attributes;
			}
		}
		for ( let i = 0, iLen = this.items.length; i < iLen; i++ ) {
			const item = this.items[ i ];
			const tag = item.item;
			const type = item.type;

			if ( type === 'open' ) {
				if ( hasAttributes( tag ) ) {
					id = tag.attributes.id;
					if ( extractedData[ id ] ) {
						tag.attributes = extractedData[ id ].attributes;
					} else {
						// Restore the id attribute alone, if exists.
						tag.attributes = id ? { id } : {};
					}
				}
				expandedDoc.addItem( type, tag );
				if ( extractedData[ id ] && extractedData[ id ].content ) {
					// Make sure the content is a textblock object
					// before adding to the doc as a textblock
					if ( typeof extractedData[ id ].content === 'object' ) {
						expandedDoc.addItem( 'textblock', extractedData[ id ].content );
						// Skip the next item in the loop since we replaced it with the content
						// from extracted data
						i++;
					}
				}
				continue;
			}

			if ( type === 'close' || type === 'blockspace' ) {
				expandedDoc.addItem( type, tag );
				continue;
			}

			const textblock = tag;
			const expandedIds = [];
			for ( let j = 0, len = textblock.textChunks.length; j < len; j++ ) {
				const chunk = textblock.textChunks[ j ];

				if ( chunk.tags ) {
					for ( let k = 0, kLen = chunk.tags.length; k < kLen; k++ ) {
						const chunkTag = chunk.tags[ k ];
						if ( !hasAttributes( chunkTag ) ) {
							continue;
						}
						id = chunkTag.attributes.id;

						if ( expandedIds.includes( id ) ) {
							// This is a close tag. Ignore
							continue;
						}

						if ( extractedData[ id ] ) {
							chunkTag.attributes = extractedData[ id ].attributes;
							if ( extractedData[ id ].content ) {
								chunk.text = extractedData[ id ].content;
							}
							// This loop will see the closing tag for this tag too.
							// So keep track of open tags.
							if ( chunkTag.attributes ) {
								expandedIds.push( chunkTag.attributes.id );
							}
						} else {
							// Restore the id attribute alone, if exists.
							chunkTag.attributes = id ? { id } : {};
						}
					}
				}
				if ( chunk.inlineContent ) {
					if ( chunk.inlineContent.expand ) {
						chunk.inlineContent = chunk.inlineContent.expand( extractedData );
					} else {
						id = chunk.inlineContent.attributes.id;
						if ( extractedData[ id ] ) {
							chunk.inlineContent.attributes = extractedData[ id ].attributes;
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

	/**
	 * Recursively adapt all nodes in the document.
	 *
	 * @method
	 * @param {Function} getAdapter Function taking a tag, returning adapted output
	 * @return {Doc} Adapted version of document TODO: warning: *shallow copied*.
	 */
	async adapt( getAdapter ) {
		let adapter, newDoc = new Doc();

		if ( this.wrapperTag ) {
			adapter = getAdapter( this.wrapperTag );
			if ( adapter ) {
				newDoc = new Doc( await adapter.adapt() );
			} else {
				newDoc = new Doc( this.wrapperTag );
			}
		}
		let transclusionContext = null;
		for ( let i = 0, len = this.items.length; i < len; i++ ) {
			const item = this.items[ i ];
			if ( this.items[ i ].type === 'open' ) {
				const tag = Utils.cloneOpenTag( item.item );
				if ( i + 1 < len && this.items[ i + 1 ].type === 'textblock' ) {
					tag.children = this.items[ i + 1 ].item;
				}
				adapter = getAdapter( tag );
				if ( adapter && !transclusionContext ) {
				// Do not adapt translation units under a transclusionContext
					newDoc.addItem( item.type, await adapter.adapt() );
				} else {
					newDoc.addItem( item.type, tag );
				}
				const about = cxutil.getProp( [ 'attributes', 'about' ], tag );
				if ( about && !Utils.isGallery( tag ) ) {
					// Presence of about attribute tells us that it is a transclusion or
					// transclusion fragment. The innerbody of the transclusion can be
					// skipped from adaption. Except in the case of Gallery with
					// typeof='mw:Extension/gallery' where we need to adapt captions
					transclusionContext = about;
				}
			} else if ( this.items[ i ].type === 'close' ) {
				const tag = item.item;
				const about = cxutil.getProp( [ 'attributes', 'about' ], tag );
				if ( about && about === transclusionContext ) {
					transclusionContext = null;
				}
				newDoc.addItem( item.type, item.item );
			} else if ( this.items[ i ].type !== 'textblock' ) {
				newDoc.addItem( item.type, item.item );
			} else {
				const textBlock = item.item;
				if ( !transclusionContext ) {
				// Do not adapt translation units under a transclusionContext
					newDoc.addItem(
						'textblock',
						await textBlock.adapt( getAdapter )
					);
				} else {
					newDoc.addItem( item.type, item.item );
				}
			}
		}

		return newDoc;
	}
}

module.exports = Doc;
