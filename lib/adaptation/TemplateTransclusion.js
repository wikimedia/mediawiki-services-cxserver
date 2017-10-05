'use strict';

const cxutil = require( '../util' );

class TemplateTransclusion {
	constructor( part, api, sourceLanguage, targetLanguage ) {
		this.in = part;

		this.targetNameLookup = ( name ) => api.titlePairRequest( name, sourceLanguage, targetLanguage );
		this.sourceTemplateDataLookup = ( name ) => api.templateDataRequest( name, sourceLanguage );
		this.targetTemplateDataLookup = ( name ) => api.templateDataRequest( name, targetLanguage );
		this.targetNamespaceLookup = () => api.getNamespaceAlias( 'Template', targetLanguage );
	}
}

TemplateTransclusion.prototype.adapt = cxutil.async( function* () {
	let out = this.in;
	let metadata = {};

	const sourceName = this.in.template.target.href;
	const targetInfo = yield this.targetNameLookup( sourceName );
	const targetTitle = targetInfo.targetTitle;
	if ( !targetTitle ) {
		// Return the template unadapted, but let the client know it is not adaptable.
		metadata.adapted = false;
	} else {
		// E.g. `Malline` in Finnish
		const templateNamespaceAlias = yield this.targetNamespaceLookup();
		// E.g. `Babel` for `Template:Babel` but `User:Babel` for `User:Babel`
		const targetTemplate = targetTitle.replace( templateNamespaceAlias + ':', '' );
		out.template.target.href = './' + targetTitle;
		out.template.target.wt = targetTemplate;

		// TODO: Handle parameters
		// const sourceParams = this.in.params;
		// mapper = new TemplateParameterMapper( sourceParams, templateDataForSource, templateDataForTarget );
		// out.params = mapper.getAdaptedParameters();
		// metadata.parameterMap = mapper.getParameterMap();

		// const sourceTemplateData = yield this.sourceTemplateDataLookup( sourceName );
		// const targetTemplateData = yield this.targetTemplateDataLookup( targetName );
		// metadata.templateData = { source: sourceTemplateData, target: targetTemplateData }

		metadata.adapted = true;
	}

	return {
		formatForParsoid: () => out,
		getMetadata: () => metadata
	};
} );

module.exports = TemplateTransclusion;
