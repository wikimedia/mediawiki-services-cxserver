'use strict';

/**
 * Contextualizer for HTML - tracks the segmentation context of the currently open node
 */
class Contextualizer {
	/**
	 * @param {Object} config
	 */
	constructor( config ) {
		this.contexts = [];
		this.config = config || {};
	}

	/**
	 * Get the context for a new tag being opened
	 *
	 * @param {Object} openTag
	 * @param {string} openTag.name HTML tag name
	 * @param {Object} openTag.attributes HTML attributes as a string map
	 * @return {string|undefined} The new context
	 */
	getChildContext( openTag ) {
		// Change to 'media' context inside figure
		if ( openTag.name === 'figure' ) {
			return 'media';
		}

		// Exception: return to undefined context inside figure//figcaption
		if ( openTag.name === 'figcaption' ) {
			return undefined;
		}

		// No change: same as parent context
		return this.getContext();
	}

	/**
	 * Get the current context
	 *
	 * @return {string|undefined} The current context
	 */
	getContext() {
		return this.contexts[ this.contexts.length - 1 ];
	}

	/**
	 * Call when a tag opens
	 *
	 * @param {Object} openTag
	 * @param {string} openTag.name HTML tag name
	 * @param {Object} openTag.attributes HTML attributes as a string map
	 */
	onOpenTag( openTag ) {
		this.contexts.push( this.getChildContext( openTag ) );
	}

	/**
	 * Call when a tag closes (or just after an empty tag opens)
	 */
	onCloseTag() {
		this.contexts.pop();
	}

	/**
	 * Determine whether sentences can be segmented into spans in this context
	 *
	 * @return {boolean} Whether sentences can be segmented into spans in this context
	 */
	canSegment() {
		return this.getContext() === undefined;
	}

}

module.exports = Contextualizer;
