'use strict';

const cxutil = require( '../util' );
const TemplateParameterMapper = require( './TemplateParameterMapper' );

class TemplateTransclusion {
	constructor( transclusionDef, api, sourceLanguage, targetLanguage ) {
		this.transclusionDef = transclusionDef;

		this.targetNameLookup = ( name ) => api.titlePairRequest( name, sourceLanguage, targetLanguage );
		this.sourceTemplateDataLookup = ( name ) => api.templateDataRequest( name, sourceLanguage );
		this.targetTemplateDataLookup = ( name ) => api.templateDataRequest( name, targetLanguage );
		this.targetNamespaceLookup = () => api.getNamespaceAlias( 'Template', targetLanguage );
	}
}

TemplateTransclusion.prototype.adapt = cxutil.async( function* () {
	let adapedTransclusionDef = this.transclusionDef;
	let metadata = {};

	const sourceTitle = this.transclusionDef.template.target.href;
	const targetInfo = yield this.targetNameLookup( sourceTitle );
	const targetTitle = targetInfo.targetTitle;
	if ( !targetTitle ) {
		// Return the template unadapted, but let the client know it is not adaptable.
		metadata.adapted = false;
	} else {
		// E.g. `Malline` in Finnish
		const templateNamespaceAlias = yield this.targetNamespaceLookup();
		// E.g. `Babel` for `Template:Babel` but `User:Babel` for `User:Babel`
		const targetTemplate = targetTitle.replace( templateNamespaceAlias + ':', '' );
		adapedTransclusionDef.template.target.href = './' + targetTitle;
		adapedTransclusionDef.template.target.wt = targetTemplate;

		const sourceParams = this.transclusionDef.template.params;
		let sourceTemplateData, targetTemplateData;
		try {
			sourceTemplateData = yield this.sourceTemplateDataLookup( sourceTitle );
		} catch ( e ) {
			// TODO: Try to extract template data from source code of template.
			sourceTemplateData = { params: {} };
		}
		try {
			targetTemplateData = yield this.targetTemplateDataLookup( targetTitle );
		} catch ( e ) {
			targetTemplateData = { params: {} };
		}
		const mapper = new TemplateParameterMapper( sourceParams, sourceTemplateData, targetTemplateData );
		adapedTransclusionDef.template.params = mapper.getAdaptedParameters();
		metadata.parameterMap = mapper.getParameterMap();
		metadata.templateData = { source: sourceTemplateData, target: targetTemplateData };

		metadata.adapted = true;
	}

	return {
		formatForParsoid: () => adapedTransclusionDef,
		getMetadata: () => metadata
	};
} );

module.exports = TemplateTransclusion;
