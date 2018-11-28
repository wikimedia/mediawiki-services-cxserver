'use strict';

const cxutil = require( '../util' );
const TemplateParameterMapper = require( './TemplateParameterMapper' );

class TemplateTransclusion {
	constructor( transclusionDef, api, sourceLanguage, targetLanguage ) {
		this.transclusionDef = transclusionDef;

		this.targetNameLookup =
			( name ) => api.titlePairRequest( name, sourceLanguage, targetLanguage );
		this.sourceTemplateDataLookup = ( name ) => api.templateDataRequest( name, sourceLanguage );
		this.targetTemplateDataLookup = ( name, hints ) => api.templateDataRequest( name, targetLanguage, hints );
		this.targetNamespaceLookup = () => api.getNamespaceAlias( 'Template', targetLanguage );
	}
}

TemplateTransclusion.prototype.adapt = cxutil.async( function* () {
	let adapedTransclusionDef = this.transclusionDef;
	let metadata = {};
	let targetInfo;
	const sourceTitle = this.transclusionDef.template.target.href;
	try {
		targetInfo = yield this.targetNameLookup( sourceTitle );
	} catch ( err ) {
		// Target title lookup failed. Invalid title?
		targetInfo = {};
	}
	const targetTitle = targetInfo.targetTitle;
	if ( !targetTitle ) {
		// Return the template unadapted, but let the client know it is not adaptable.
		metadata.adapted = false;
		metadata.targetExists = false;
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
			let paramHints = Object.keys( sourceParams );
			targetTemplateData = yield this.targetTemplateDataLookup( targetTitle, paramHints );
		} catch ( e ) {
			targetTemplateData = { params: {} };
		}
		const mapper = new TemplateParameterMapper(
			sourceParams, sourceTemplateData, targetTemplateData
		);
		adapedTransclusionDef.template.params = mapper.getAdaptedParameters();
		metadata.parameterMap = mapper.getParameterMap();
		metadata.templateData = { source: sourceTemplateData, target: targetTemplateData };
		metadata.targetExists = true;

		if ( Object.keys( sourceParams ).length > 0 ) {
			const mappedParamNames = Object.keys( adapedTransclusionDef.template.params );
			metadata.adapted = mappedParamNames.length > 0;
			const mandatoryParams = mapper.getMandatoryParamsForTarget();
			const isEveryMandatoryParamMapped = mandatoryParams.every(
				( paramName ) => mappedParamNames.includes( paramName )
			);
			if ( isEveryMandatoryParamMapped ) {
				metadata.partial = false;
			} else {
				metadata.partial = true;
			}
		} else {
			// There were no parameters to adapt
			metadata.adapted = true;
		}
	}

	return {
		formatForParsoid: () => adapedTransclusionDef,
		getMetadata: () => metadata
	};
} );

module.exports = TemplateTransclusion;
