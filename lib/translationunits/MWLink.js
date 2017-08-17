'use strict';

var cxutil = require( '../util.js' ),
	TranslationUnit = require( './TranslationUnit.js' ),
	MWApiRequestManager = require( '../mw/ApiRequestManager.js' );

class MWLink extends TranslationUnit {
	constructor( node, sourceLanguage, targetLanguage, context ) {
		super( node, sourceLanguage, targetLanguage, context );
		// Nothing else?
	}
}

MWLink.matchTagNames = [ 'a' ];
MWLink.matchRdfaTypes = [ 'mw:WikiLink' ];

MWLink.prototype.adapt = cxutil.async( function* () {
	var linkPairInfo;

	linkPairInfo = yield new MWApiRequestManager( this.context )
		.titlePairRequest( this.node.attributes.href, this.sourceLanguage, this.targetLanguage );

	if ( linkPairInfo.targetTitle ) {
		// NOTE: This paths we are setting here are not relative paths.
		this.node.attributes[ 'href' ] = linkPairInfo.targetTitle;
	} else {
		// TODO: This format is not decided yet. We do need to inform client about failed
		// adaptations somehow.
		this.node.attributes[ 'data-cx' ] = JSON.stringify( {
			adapted: false,
			sourceTitle: linkPairInfo.sourceTitle
		} );
	}

	return this.node;
} );

module.exports = MWLink;
