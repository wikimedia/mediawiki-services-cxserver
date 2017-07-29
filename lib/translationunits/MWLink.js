var util = require( 'util' ),
	cxutil = require( '../util.js' ),
	TranslationUnit = require( './TranslationUnit.js' );

function MWLink( node, sourceLanguage, targetLanguage, context ) {
	this.node = node;
	this.sourceLanguage = sourceLanguage;
	this.targetLanguage = targetLanguage;
	this.context = context;
}

util.inherits( MWLink, TranslationUnit );

MWLink.name = 'link';
MWLink.matchTagNames = [ 'a' ];
MWLink.matchRdfaTypes = [ 'mw:WikiLink' ];

MWLink.prototype.adapt = cxutil.async( function* () {
	// XXX: Just a marker for now. To be removed
	this.node.attributes[ 'adapted' ] = 'true';
	this.node.attributes[ 'href' ] = yield this.findLinkTarget(
		this.sourceLanguage,
		this.node.attributes.href,
		this.targetLanguage
	);

	return this.node;
} );

/**
 * Find link target for the given source title
 * @param {string} sourceLanguage
 * @param {string} sourceTitle
 * @param {string} targetLanguage
 * @return {Promise}
 */
MWLink.prototype.findLinkTarget = function ( sourceLanguage, sourceTitle, targetLanguage ) {
	console.log( 'Adapting from ' + sourceLanguage + ' to ' + targetLanguage );
	return Promise.resolve( sourceTitle );
};

module.exports = MWLink;
