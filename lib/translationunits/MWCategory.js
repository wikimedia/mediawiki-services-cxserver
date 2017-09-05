'use strict';

const cxutil = require( '../util.js' ),
	TranslationUnit = require( './TranslationUnit.js' ),
	MWAPIRequestManager = require( '../mw/ApiRequestManager.js' );

class MWCategory extends TranslationUnit {}

MWCategory.prototype.adapt = cxutil.async( function* () {
	var namespaceAlias, adaptedTitle, titlePairInfo,
		categoryTitle = this.node.attributes.href;

	titlePairInfo = yield new MWAPIRequestManager( this.context )
		.titlePairRequest( categoryTitle, this.sourceLanguage, this.targetLanguage );

	if ( titlePairInfo.targetTitle ) {
		adaptedTitle = titlePairInfo.targetTitle;
		namespaceAlias = yield new MWAPIRequestManager( this.context )
			.getNamespaceAlias( 'Category', this.targetLanguage );
		adaptedTitle = adaptedTitle.replace( /^(\.\.?\/)*([^:]+)(:)/, '$1' + namespaceAlias + '$3' );
		this.node.attributes.href = adaptedTitle;
	} else {
		this.node.attributes[ 'data-cx' ] = JSON.stringify( {
			adapted: false,
			sourceTitle: titlePairInfo.sourceTitle
		} );
	}
	return this.node;
} );

MWCategory.matchTagNames = [ 'link' ];
MWCategory.matchRdfaTypes = [ 'mw:PageProp/Category' ];

module.exports = MWCategory;
