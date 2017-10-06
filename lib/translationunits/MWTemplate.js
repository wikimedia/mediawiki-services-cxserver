'use strict';

const TransclusionAdapter = require( '../adaptation/TransclusionAdapter' );
const TranslationUnit = require( './TranslationUnit' );
const cxutil = require( '../util' );

/*
 * This class adapts templates.
 *
 * TODO: see dm.MWTransclusion classes in VE.
 * TODO: attempt adapting multipart templates as well
 * TODO: move (or copy for now) template mappings from CX to CXServer
 * See also https://www.mediawiki.org/wiki/Specs/HTML/1.5.0#Template_markup
 */
/*
 * Simple example {{Babel|fi}} in Finnish Wikipedia results in this html in VE:
 * <span about="#mwt3" typeof="mw:Transclusion" data-mw="..." id="mwSQ">
 * </span><table ... about="#mwt3" id="mwSg">...</table>
 *
 * data-mw being:
 * {
 *   "parts":[
 *    {
 *       "template":{
 *         "target":{
 *           "wt":"Babel",
 *           "href":"./Malline:Babel"
 *         },
 *         "params":{
 *           "1":{
 *             "wt":"fi"
 *           }
 *         },
 *         "i":0
 *       }
 *     }
 *   ]
 * }
 */
class MWTemplate extends TranslationUnit {}

MWTemplate.prototype.adapt = cxutil.async( function* () {
	let dataMW, dataCX = {};

	if ( !this.node.attributes[ 'data-mw' ] ) {
		this.node.attributes[ 'data-cx' ] = JSON.stringify( { adapted: false } );
		this.log( 'warn', 'Not-adapting a template node without data-mw: ' + this.node.attributes.id );
		return this.node;
	}

	try {
		dataMW = JSON.parse( this.node.attributes[ 'data-mw' ] );
	} catch ( e ) {
		this.node.attributes[ 'data-cx' ] = JSON.stringify( { adapted: false } );
		this.log( 'error', 'Not-adapting a template node with non-JSON data-mw: ' + this.node.attributes.id );
		return this.node;
	}

	if ( !dataMW.parts || dataMW.parts.length < 1 ) {
		this.node.attributes[ 'data-cx' ] = JSON.stringify( { adapted: false } );
		this.log( 'error', 'Not-adapting a template node with empty data-mw.parts: ' + this.node.attributes.id );
		return this.node;
	}

	const adapter = new TransclusionAdapter( dataMW.parts, this.api, this.sourceLanguage, this.targetLanguage );
	const adapterResult = yield adapter.process();
	dataMW.parts = adapterResult.getParsoidData();
	dataCX = adapterResult.getCXServerData();

	this.node.attributes[ 'data-mw' ] = JSON.stringify( dataMW );
	this.node.attributes[ 'data-cx' ] = JSON.stringify( dataCX );

	return this.node;
} );

MWTemplate.matchRdfaTypes = [ 'mw:Transclusion' ];

module.exports = MWTemplate;
