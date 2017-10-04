'use strict';

const cxutil = require( '../util.js' ),
	TranslationUnit = require( './TranslationUnit.js' ),
	MWAPIRequestManager = require( '../mw/ApiRequestManager.js' );

class MWCategory extends TranslationUnit {}

MWCategory.prototype.adapt = cxutil.async( function* () {
	let dataCX = { adapted: false },
		categoryTitle = this.node.attributes.href;

	const titlePairInfo = yield new MWAPIRequestManager( this.context )
		.titlePairRequest( categoryTitle, this.sourceLanguage, this.targetLanguage );

	dataCX.sourceTitle = titlePairInfo.sourceTitle;
	if ( titlePairInfo.targetTitle ) {
		let adaptedTitle = titlePairInfo.targetTitle;
		let namespaceAlias = yield new MWAPIRequestManager( this.context )
			.getNamespaceAlias( 'Category', this.targetLanguage );
		adaptedTitle = adaptedTitle.replace( /^(\.\.?\/)*([^:]+)(:)/, '$1' + namespaceAlias + '$3' );
		this.node.attributes.href = adaptedTitle;

		dataCX.adapted = true;
		dataCX.targetTitle = titlePairInfo.targetTitle;
	}

	this.node.attributes[ 'data-cx' ] = JSON.stringify( dataCX );
	return this.node;
} );

MWCategory.matchTagNames = [ 'link' ];
MWCategory.matchRdfaTypes = [ 'mw:PageProp/Category' ];

module.exports = MWCategory;
