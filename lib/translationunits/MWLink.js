'use strict';

var cxutil = require( '../util.js' ),
	TranslationUnit = require( './TranslationUnit.js' ),
	MWApiRequestManager = require( '../mw/ApiRequestManager.js' );

class MWLink extends TranslationUnit {
}

MWLink.matchTagNames = [ 'a' ];
MWLink.matchRdfaTypes = [ 'mw:WikiLink' ];

MWLink.prototype.adapt = cxutil.async( function* () {
	var linkPairInfo, adaptationInfo, sourceTitleInfoRequest,
		apiRequestManager = new MWApiRequestManager( this.context );

	adaptationInfo = {
		adapted: false
	};

	// Do not wait(pause using yield) for sourceTitleInfoRequest info, but start the request.
	sourceTitleInfoRequest = apiRequestManager.titleInfoRequest(
		this.node.attributes.href, this.sourceLanguage
	);

	linkPairInfo = yield apiRequestManager.titlePairRequest(
		this.node.attributes.href, this.sourceLanguage, this.targetLanguage
	);

	if ( linkPairInfo.targetTitle ) {
		// NOTE: This paths we are setting here are not relative paths.
		this.node.attributes[ 'href' ] = linkPairInfo.targetTitle;
		adaptationInfo.targetTitle = yield apiRequestManager.titleInfoRequest(
			linkPairInfo.targetTitle, this.targetLanguage
		);
		adaptationInfo.adapted = true;
	}

	adaptationInfo.sourceTitle = yield sourceTitleInfoRequest;

	this.node.attributes[ 'data-cx' ] = JSON.stringify( adaptationInfo );
	return this.node;
} );

module.exports = MWLink;
