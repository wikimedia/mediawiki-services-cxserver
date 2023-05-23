'use strict';

const TranslationUnit = require( './TranslationUnit' );
const cxutil = require( '../util' );

const titleInfoFields = [
	'title',
	'thumbnail',
	'description',
	'pageprops'
];

function getUsefulFields( titleInfo ) {
	const result = {};
	for ( const field of titleInfoFields ) {
		result[ field ] = titleInfo[ field ];
	}

	return result;
}

function isISBN( node ) {
	const isbnLinkRegex = /^\.\/Special:BookSources\/([0-9Xx]+)/;
	if ( isbnLinkRegex.test( node.attributes.href ) ) {
		const isbnCode = node.attributes.href.split( isbnLinkRegex )[ 1 ];
		// Verify format of ISBN.
		// Ref: ve.dm.MWMagicLinkIsbnType#getCode
		return /^(97[89])?\d{9}[0-9Xx]$/.test( isbnCode );
	}
	return false;
}

class MWLink extends TranslationUnit {
	async adapt() {
		const adaptationInfo = {
			adapted: false
		};

		// ISBN links usually don't have title attributes.
		// https://www.mediawiki.org/wiki/Specs/HTML/2.1.0#ISBN_link
		if ( isISBN( this.node ) ) {
			adaptationInfo.adapted = true;
			adaptationInfo.targetTitle = {
				title: this.node.attributes.href.replace( './', '' ),
				pagelanguage: this.targetLanguage
			};
			adaptationInfo.sourceTitle = {
				title: this.node.attributes.href.replace( './', '' ),
				pagelanguage: this.sourceLanguage
			};
			this.node.attributes[ 'data-cx' ] = JSON.stringify( adaptationInfo );
			return this.node;
		}

		if ( !this.node.attributes.title ) {
			// For https://phabricator.wikimedia.org/T226611
			this.log( 'debug', 'No title for the MWLink: ' + JSON.stringify( this.node ) );
		}

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
		const sourceTitleInfo = await sourceTitleInfoRequest;
		const QID = cxutil.getProp( [ 'pageprops', 'wikibase_item' ], sourceTitleInfo );

		let wikidataLabelRequest = null;
		if ( QID ) {
			wikidataLabelRequest = this.api.wikidataRequest( QID, this.targetLanguage );
		}

		const mtClient = this.context.conf.mtClient;
		let translatedLabelRequest = null;

		if ( mtClient && this.node.attributes.title ) {
			translatedLabelRequest = mtClient.translate(
				this.sourceLanguage,
				this.targetLanguage,
				this.node.attributes.title,
				'text'
			);
		}

		const targetTitle = ( await linkPairInfoRequest ).targetTitle;
		let targetTitleInfo = {};
		if ( targetTitle ) {
			targetTitleInfo = await this.api.titleInfoRequest( targetTitle, this.targetLanguage );
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
			const [ wikidataLabel, translatedLabel ] = await Promise.all( [ wikidataLabelRequest, translatedLabelRequest ] );

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
	}
}

MWLink.matchTagNames = [ 'a' ];
MWLink.matchRdfaTypes = [ 'mw:WikiLink' ];
// If a link has data-mw, do not consider as link, but as a template.
// So, define allowed attributes.
MWLink.allowedAttrs = [ 'title', 'id', 'href', 'class', 'rel', 'data-linkid' ];

module.exports = MWLink;
