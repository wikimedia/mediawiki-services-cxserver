'use strict';

const cxutil = require( '../util' );
const TranslationUnit = require( './TranslationUnit' );
const titleInfoFields = [
	'title',
	'thumbnail',
	'description',
	'pageprops'
];

class MWLink extends TranslationUnit {}

MWLink.matchTagNames = [ 'a' ];
MWLink.matchRdfaTypes = [ 'mw:WikiLink' ];
// If a link has data-mw, do not consider as link, but as a template.
// So, define allowed attributes.
MWLink.allowedAttrs = [ 'title', 'id', 'href', 'class', 'rel', 'data-linkid' ];

function getUsefulFields( titleInfo ) {
	var result = {};
	for ( const field of titleInfoFields ) {
		result[ field ] = titleInfo[ field ];
	}

	return result;
}

MWLink.prototype.adapt = cxutil.async( function* () {
	var linkPairInfo, adaptationInfo, sourceTitleInfoRequest;

	adaptationInfo = {
		adapted: false
	};

	// Do not wait(pause using yield) for sourceTitleInfoRequest info, but start the request.
	sourceTitleInfoRequest = this.api.titleInfoRequest(
		this.node.attributes.href, this.sourceLanguage
	);

	linkPairInfo = yield this.api.titlePairRequest(
		this.node.attributes.href, this.sourceLanguage, this.targetLanguage
	);

	if ( linkPairInfo.targetTitle ) {
		// NOTE: This paths we are setting here are not relative paths.
		this.node.attributes.href = linkPairInfo.targetTitle;
		this.node.attributes.title = linkPairInfo.targetTitle;
		adaptationInfo.targetTitle = getUsefulFields(
			yield this.api.titleInfoRequest(
				linkPairInfo.targetTitle, this.targetLanguage
			)
		);
		// FIXME: This is misused in CX to mean the code of the wiki
		adaptationInfo.targetTitle.pagelanguage = this.targetLanguage;
		adaptationInfo.adapted = true;
	}

	adaptationInfo.sourceTitle = getUsefulFields( yield sourceTitleInfoRequest );
	// FIXME: This is misused in CX to mean the code of the wiki
	adaptationInfo.sourceTitle.pagelanguage = this.sourceLanguage;

	this.node.attributes[ 'data-cx' ] = JSON.stringify( adaptationInfo );
	return this.node;
} );

module.exports = MWLink;
