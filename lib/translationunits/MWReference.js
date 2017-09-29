'use strict';

const cxutil = require( '../util.js' ),
	TranslationUnit = require( './TranslationUnit.js' );

/**
 * This class handles the `<ref>` wikitext tag.
 *
 * This tag rendered as span with typeof="mw:Extension/ref" and rel="dc:references" by parsoid.
 * By default parsoid also adds data-mw.body.id that refers to the rendered element produced by
 * the `<references>` tag. But here we expect that data-mw.body.html is also provided so that
 * it can be adapted without any dependencies to other sections of the article.
 */
class MWReference extends TranslationUnit {}

MWReference.prototype.adapt = cxutil.async( function* () {
	let refData;

	// TODO: This format is not decided yet. We do need to inform client about failed
	// adaptations somehow.
	// This will be reset later if adaptation is succesful
	this.node.attributes[ 'data-cx' ] = JSON.stringify( {
		adapted: false
	} );

	try {
		refData = JSON.parse( this.node.attributes[ 'data-mw' ] );
	} catch ( e ) {
		this.log( 'error', 'Not-adapting a reference node with non-JSON data-mw: ' + this.node.attributes.id );
		return this.node;
	}

	if ( !refData ) {
		this.log( 'error', 'Not-adapting a reference node without data-mw: ' + this.node.attributes.id );
		return this.node;
	}

	let refBody = refData.body && refData.body.html;
	if ( !refBody ) {
		this.log( 'debug', 'Not-adapting a reference node without data-mw.body.html: ' + this.node.attributes.id );
		return this.node;
	}

	// TODO: Parse recursively instead of just MTing to handle templates

	if ( this.context.conf.mtClient ) {
		// Translate reference contents
		let translatedRefBody = yield this.context.conf.mtClient.translate(
			this.sourceLanguage, this.targetLanguage, refBody
		);

		refData.body.html = translatedRefBody;
	}

	this.node.attributes[ 'data-mw' ] = JSON.stringify( refData );
	this.node.attributes[ 'data-cx' ] = JSON.stringify( {
		adapted: true
	} );

	return this.node;
} );

MWReference.matchTagNames = [ 'span' ];
MWReference.matchRdfaTypes = [ 'dc:references', 'mw:Extension/ref' ];

module.exports = MWReference;
