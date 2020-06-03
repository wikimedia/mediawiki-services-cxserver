'use strict';

/**
 * @external Doc
 */

/**
 * A chunk of uniformly-annotated inline text
 *
 * The annotations consist of a list of inline tags (<a>, <i> etc), and an
 * optional "inline element" (br/img tag, or a sub-document e.g. for a
 * reference span). The tags and/or reference apply to the whole text;
 * therefore text with varying markup must be split into multiple chunks.
 *
 * @class
 */
class TextChunk {
	/**
	 * @param {string} text Plaintext in the chunk (can be '')
	 * @param {Object[]} tags array of SAX open tag objects, for the applicable tags
	 * @param {Doc|Object} [inlineContent] tag or sub-doc
	 */
	constructor( text, tags, inlineContent ) {
		this.text = text;
		this.tags = tags;
		this.inlineContent = inlineContent;
	}
}
module.exports = TextChunk;
