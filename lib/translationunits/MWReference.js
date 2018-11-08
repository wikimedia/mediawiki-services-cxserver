'use strict';

const cxutil = require( '../util.js' ),
	Adapter = require( '../Adapter' ),
	TranslationUnit = require( './TranslationUnit.js' ),
	jsdom = require( 'jsdom' );

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
	let isAdapted = false;

	// TODO: This format is not decided yet. We do need to inform client about failed
	// adaptations somehow.
	// This will be reset later if adaptation is succesful
	this.node.attributes[ 'data-cx' ] = JSON.stringify( {
		adapted: isAdapted
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

	let isTransclusion = refBody.indexOf( 'typeof="mw:Transclusion"' ) >= 0;
	let translatedRefBody = refBody;
	if ( !isTransclusion && this.context.conf.mtClient ) {
		// / Not a transclusion. Machine translate the content.
		translatedRefBody = yield this.context.conf.mtClient.translate(
			this.sourceLanguage, this.targetLanguage, refBody
		);
		isAdapted = true;
	}

	if ( isTransclusion ) {
		// Adapt reference contents using a child adapter.
		// The refBody here is usually Cite web and such citation templates.
		// The content may not be wrapped in a parent tag. So we need to wrap it.
		refBody = `<div>${refBody}</div>`;
		let adapter = new Adapter(
			this.sourceLanguage, this.targetLanguage, this.api, this.context
		);
		const translatedRefBodyDoc = yield adapter.adapt( refBody );
		translatedRefBody = translatedRefBodyDoc.getHtml();

		// Find if any child is non-adapated in this transclusion
		const translatedRefBodyDom = new jsdom.JSDOM( translatedRefBody );
		let dataCXNodes = translatedRefBodyDom.window.document.querySelectorAll( '[data-cx]' );
		isAdapted = [ ...dataCXNodes ].every( ( node ) => {
			let dataCX = JSON.parse( node.dataset.cx );
			return Array.isArray( dataCX ) ?
				dataCX.every( ( data ) => !!data.adapted ) :
				dataCX.adapted;
		} );
		translatedRefBody = translatedRefBody.replace( /^<div>|<\/div>$/g, '' );
	}
	// Get HTML and unwrap the the div tags
	refData.body.html = translatedRefBody;

	this.node.attributes[ 'data-mw' ] = JSON.stringify( refData );
	this.node.attributes[ 'data-cx' ] = JSON.stringify( {
		adapted: isAdapted
	} );

	return this.node;
} );

MWReference.matchTagNames = [ 'span', 'sup' ];
MWReference.matchRdfaTypes = [ 'dc:references', 'mw:Extension/ref' ];

module.exports = MWReference;
