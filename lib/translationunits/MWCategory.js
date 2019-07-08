'use strict';

const TranslationUnit = require( './TranslationUnit.js' );

class MWCategory extends TranslationUnit {
	async adapt() {
		const dataCX = { adapted: false };
		const categoryTitle = this.node.attributes.href;
		const titlePairInfo = await this.api.titlePairRequest(
			categoryTitle, this.sourceLanguage, this.targetLanguage
		);

		dataCX.sourceTitle = titlePairInfo.sourceTitle;
		if ( titlePairInfo.targetTitle ) {
			let adaptedTitle = titlePairInfo.targetTitle;
			const namespaceAlias = await this.api.getNamespaceAlias( 'Category', this.targetLanguage );
			adaptedTitle = adaptedTitle.replace( /^(\.\.?\/)*([^:]+)(:)/, '$1' + namespaceAlias + '$3' );
			this.node.attributes.href = adaptedTitle;

			dataCX.adapted = true;
			dataCX.targetTitle = titlePairInfo.targetTitle;
		}

		this.node.attributes[ 'data-cx' ] = JSON.stringify( dataCX );
		return this.node;
	}
}
MWCategory.matchTagNames = [ 'link' ];
MWCategory.matchRdfaTypes = [ 'mw:PageProp/Category' ];

module.exports = MWCategory;
