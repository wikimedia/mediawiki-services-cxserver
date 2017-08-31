'use strict';

const TranslationUnit = require( './TranslationUnit' );

/*
 * TODO: see dm.MWTransclusion classes in VE.
 * TODO: attempt adapting multipart templates as well
 * TODO: write a template data request wrapper
 * TODO: move (or copy for now) template mappings from CX to CXServer
 */

class MWTemplate extends TranslationUnit {
	adapt() {
		return this.node;
	}
}

MWTemplate.matchRdfaTypes = [ 'mw:Transclusion' ];

module.exports = MWTemplate;
