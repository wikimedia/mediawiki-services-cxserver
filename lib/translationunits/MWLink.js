'use strict';

const TranslationUnit = require( './TranslationUnit' );
const cxutil = require( '../util' );

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
	const adaptationInfo = {
		adapted: false
	};

	// Phase 1: Enqueue requests which are done always
	const sourceTitleInfoRequest = this.api.titleInfoRequest(
		this.node.attributes.href, this.sourceLanguage
	);
	const linkPairInfoRequest = this.api.titlePairRequest(
		this.node.attributes.href, this.sourceLanguage, this.targetLanguage
	);

	// Phase 2: process these requests and fire new ones

	// The source title info is required to know Q-id. In theory we could avoid
	// that and use title+site combination, but I don't want to hardcode the siteid
	// construction logic here. The wikibase repo is currently hardcoded, but that
	// info is easily available via prop=wikibase.
	const sourceTitleInfo = yield sourceTitleInfoRequest;
	const QID = cxutil.getProp( [ 'pageprops', 'wikibase_item' ], sourceTitleInfo );

	let wikidataLabelRequest = null;
	if ( QID ) {
		wikidataLabelRequest = this.api.wikidataRequest( QID, this.targetLanguage );
	}

	const mtClient = this.context.conf.mtClient;
	let translatedLabelRequest = null;
	if ( mtClient ) {
		translatedLabelRequest = mtClient.translate(
			this.sourceLanguage,
			this.targetLanguage,
			this.node.attributes.title,
			'text'
		);
	}

	const targetTitle = ( yield linkPairInfoRequest ).targetTitle;
	let targetTitleInfo = {};
	if ( targetTitle ) {
		targetTitleInfo = yield this.api.titleInfoRequest( targetTitle, this.targetLanguage );
	}

	// Phase 3: Format and set link attributes
	adaptationInfo.sourceTitle = getUsefulFields( sourceTitleInfo );
	// FIXME: This is misused in CX to mean the code of the wiki
	adaptationInfo.sourceTitle.pagelanguage = this.sourceLanguage;

	if ( targetTitle ) {
		adaptationInfo.targetTitle = getUsefulFields( targetTitleInfo );
		// FIXME: This is misused in CX to mean the code of the wiki
		adaptationInfo.targetTitle.pagelanguage = this.targetLanguage;
		adaptationInfo.adapted = true;
		adaptationInfo.targetFrom = 'link';
		this.node.attributes.href = this.node.attributes.title = targetTitle;
	} else {
		const wikidataLabel = yield wikidataLabelRequest;
		const translatedLabel = yield translatedLabelRequest;

		if ( wikidataLabel ) {
			adaptationInfo.targetFrom = 'label';
			this.node.attributes.href = this.node.attributes.title = wikidataLabel;
		} else if ( translatedLabel ) {
			adaptationInfo.targetFrom = 'mt';
			this.node.attributes.href = this.node.attributes.title = translatedLabel;
		} else {
			adaptationInfo.targetFrom = 'source';
		}
	}

	this.node.attributes[ 'data-cx' ] = JSON.stringify( adaptationInfo );

	return this.node;
} );

module.exports = MWLink;
