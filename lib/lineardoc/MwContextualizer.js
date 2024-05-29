'use strict';

const Contextualizer = require( './Contextualizer' );
const cxutil = require( './../util' );
const contentBranchNodeNames = [ 'blockquote', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'p', 'pre', 'div', 'table', 'ol', 'ul', 'dl', 'figure', 'center', 'section' ];

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
	 * @param {Object} config.removableSections containing array of classes and rdfa values.
	 *  Tags matching these classes or rdfa values will be marked as removable.
	 *  See config/MWPageLoader.yaml
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
		const context = this.getContext(),
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

		if ( tag.name === 'span' && type.match( /(^|\s)(mw:File|mw:Image|mw:Video|mw:Audio)\b/ ) ) {
			return 'media-inline';
		}

		// Immediate childrens of body are sections
		if ( context === undefined && tag.name === 'body' ) {
			return 'section';
		}

		// And figure//figcaption is contentBranch
		if ( ( context === 'media' || context === 'media-inline' ) && tag.name === 'figcaption' ) {
			return 'contentBranch';
		}

		// And ContentBranchNodes are contentBranch
		if ( ( context === 'section' || context === undefined ) && contentBranchNodeNames.includes( tag.name ) ) {
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
	 *
	 * @param {Object} tag
	 * @return {boolean}
	 */
	isRemovable( tag ) {
		const removableSections = this.config.removableSections;
		if ( !this.config.removableSections ) {
			return false;
		}

		if ( this.removableTransclusionFragments.includes( tag.attributes.about ) ) {
			// Once a transclusion is removed, make sure their fragments also removed
			// even if the fragment does not match with removableSections configuration.
			return true;
		}

		const classList = tag.attributes.class ? tag.attributes.class.split( ' ' ) : [];
		for ( let i = 0; i < removableSections.classes.length; i++ ) {
			if ( classList.includes( removableSections.classes[ i ] ) ) {
				if ( tag.attributes.about ) {
					this.removableTransclusionFragments.push( tag.attributes.about );
				}
				return true;
			}
		}

		const types = tag.attributes.typeof ? tag.attributes.typeof.split( ' ' ) : [];
		const rels = tag.attributes.rel ? tag.attributes.rel.split( ' ' ) : [];
		const rdfa = types.concat( rels );
		for ( let i = 0; i < removableSections.rdfa.length; i++ ) {
			// Make sure that the rdfa value matches with removable section rdfa and does not
			// have other rdfas in same element.
			if ( rdfa.includes( removableSections.rdfa[ i ] && rdfa.length === 1 ) ) {
				if ( tag.attributes.about ) {
					this.removableTransclusionFragments.push( tag.attributes.about );
				}
				return true;
			}
		}

		const dataMW = tag.attributes[ 'data-mw' ];
		if ( !dataMW ) {
			return false;
		}

		// See https://phabricator.wikimedia.org/T274133 for more info
		let mwData = {};
		try {
			mwData = JSON.parse( dataMW );
		} catch ( e ) {
			return false;
		}
		const templateName = cxutil.getProp( [ 'parts', 0, 'template', 'target', 'wt' ], mwData );
		if ( !templateName ) {
			return false;
		}

		for ( let i = 0; i < removableSections.templates.length; i++ ) {
			let removableTemplateNameRegExp;
			const removableTemplateName = removableSections.templates[ i ];

			if ( removableTemplateName[ 0 ] === '/' && removableTemplateName.slice( -1 ) === '/' ) {
				// A regular expression is given.
				removableTemplateNameRegExp = new RegExp( removableTemplateName.slice( 1, -1 ), 'i' );
			}

			const match = removableTemplateNameRegExp ?
				templateName.match( removableTemplateNameRegExp ) :
				templateName.toLowerCase() === removableTemplateName.toLowerCase();

			if ( match ) {
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
