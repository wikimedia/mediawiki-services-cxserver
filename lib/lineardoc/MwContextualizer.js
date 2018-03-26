'use strict';

const Contextualizer = require( './Contextualizer' );
const contentBranchNodeNames = [ 'blockquote', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'p', 'pre', 'div', 'table', 'ol', 'ul', 'dl', 'figure' ];

/**
 * Contextualizer for MediaWiki DOM HTML
 *
 * See https://www.mediawiki.org/wiki/Specs/HTML
 *
 * @class
 * @extends Contextualizer
 * @constructor
 */
class MwContextualizer extends Contextualizer {
	/**
	 * @param {Object} config
	 * @cfg {Object} removableSections containing array of classes and rdfa values.
	 *  Tags matching these classes or rdfa values will be marked as removable.
	 *  See mw/MWPageLoader.config.json
	 */
	constructor( config ) {
		super( config );
		// Array holding transclusion fragment ids(about attribute values)
		this.removableTransclusionFragments = [];
	}

	/**
	 * @inheritdoc
	 */
	getChildContext( tag ) {
		var context = this.getContext(),
			type = tag.attributes.typeof || tag.attributes.rel || '';

		if ( context === 'removable' || this.isRemovable( tag ) ) {
			return 'removable';
		}

		// Any descendent of Transclusion/Placeholder is verbatim
		if ( context === 'verbatim' || type.match( /(^|\s)(mw:Transclusion|mw:Placeholder)\b/ ) ) {
			return 'verbatim';
		}

		// Otherwise, figure is media
		if ( tag.name === 'figure' ) {
			return 'media';
		}

		// Immediate childrens of body are sections
		if ( context === undefined && tag.name === 'body' ) {
			return 'section';
		}

		// And figure//figcaption is contentBranch
		if ( context === 'media' && tag.name === 'figcaption' ) {
			return 'contentBranch';
		}

		// And ContentBranchNodes are contentBranch
		if ( ( context === 'section' || context === undefined ) && contentBranchNodeNames.indexOf( tag.name ) > -1 ) {
			return 'contentBranch';
		}

		// Else same as parent context
		return context;
	}

	/**
	 * @inheritdoc
	 */
	canSegment() {
		return this.getContext() === 'contentBranch';
	}

	/**
	 * Check if the tag need to be ignored while parsing and hence removed.
	 * @param {Object} tag
	 * @return {boolean}
	 */
	isRemovable( tag ) {
		if ( !this.config.removableSections ) {
			return false;
		}

		if ( this.removableTransclusionFragments.includes( tag.attributes.about ) ) {
			// Once a transclusion is removed, make sure their fragments also removed
			// even if the fragment does not match with removableSections configuration.
			return true;
		}

		let classList = tag.attributes.class ? tag.attributes.class.split( ' ' ) : [];
		for ( let i = 0; i < this.config.removableSections.classes.length; i++ ) {
			if ( classList.includes( this.config.removableSections.classes[ i ] ) ) {
				if ( tag.attributes.about ) {
					this.removableTransclusionFragments.push( tag.attributes.about );
				}
				return true;
			}
		}

		let types = tag.attributes.typeof ? tag.attributes.typeof.split( ' ' ) : [];
		let rels = tag.attributes.rel ? tag.attributes.rel.split( ' ' ) : [];
		let rdfa = types.concat( rels );
		for ( let i = 0; i < this.config.removableSections.rdfa.length; i++ ) {
			if ( rdfa.includes( this.config.removableSections.rdfa[ i ] ) ) {
				if ( tag.attributes.about ) {
					this.removableTransclusionFragments.push( tag.attributes.about );
				}
				return true;
			}
		}

		return false;
	}
}

module.exports = MwContextualizer;
