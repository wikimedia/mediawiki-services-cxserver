'use strict';

/**
 * @external MWApiRequestManager
 */

const TemplateParameterMapper = require( './TemplateParameterMapper' );
const sqlite = require( 'sqlite' );
const sqlite3 = require( 'sqlite3' );
const TEMPLATE_MAPPING_THRESHOLD_SCORE = 0.56;

class TemplateTransclusion {
	/**
	 * Creates an instance of TemplateTransclusion.
	 *
	 * @param {Object} transclusionDef
	 * @param {MWApiRequestManager} api
	 * @param {string} sourceLanguage
	 * @param {string} targetLanguage
	 * @param {Object} [options]
	 * @param {string} options.templateMappingDatabase Template mapping database path
	 */
	constructor( transclusionDef, api, sourceLanguage, targetLanguage, options = {} ) {
		this.transclusionDef = transclusionDef;
		this.sourceLanguage = sourceLanguage;
		this.targetLanguage = targetLanguage;
		this.api = api;
		this.templateMappingDatabase = options.templateMappingDatabase;
	}

	async adapt() {
		const adaptedTransclusionDef = this.transclusionDef;
		const metadata = {};
		let targetInfo;
		const sourceTitle = this.transclusionDef.template.target.href;
		const normalizedSourceTitle = await this.api.normalizeTitle( sourceTitle, this.sourceLanguage );
		try {
			targetInfo = await this.api.titlePairRequest( sourceTitle, this.sourceLanguage, this.targetLanguage );
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
			const templateNamespaceAlias = await this.api.getNamespaceAlias( 'Template', this.targetLanguage );
			// E.g. `Babel` for `Template:Babel` but `User:Babel` for `User:Babel`
			const targetTemplate = targetTitle.replace( templateNamespaceAlias + ':', '' );
			adaptedTransclusionDef.template.target.href = './' + targetTitle;
			adaptedTransclusionDef.template.target.wt = targetTemplate;

			const sourceParams = this.transclusionDef.template.params;
			let sourceTemplateData, targetTemplateData;
			try {
				sourceTemplateData = await this.api.templateDataRequest( sourceTitle, this.sourceLanguage );
			} catch ( e ) {
				// TODO: Try to extract template data from source code of template.
				sourceTemplateData = { params: {} };
			}
			try {
				const paramHints = Object.keys( sourceParams );
				targetTemplateData = await this.api.templateDataRequest( targetTitle, this.targetLanguage, paramHints );
			} catch ( e ) {
				targetTemplateData = { params: {} };
			}

			let mappingFromDatabase = {};
			if ( this.templateMappingDatabase ) {
				mappingFromDatabase = await this.getMappingFromDatabase( this.templateMappingDatabase, normalizedSourceTitle );
			}
			const mapper = new TemplateParameterMapper(
				sourceParams, sourceTemplateData, targetTemplateData, mappingFromDatabase
			);
			adaptedTransclusionDef.template.params = mapper.getAdaptedParameters();
			metadata.parameterMap = mapper.getParameterMap();
			metadata.templateData = { source: sourceTemplateData, target: targetTemplateData };
			metadata.targetExists = true;

			const mandatoryParams = mapper.getMandatoryParamsForTarget();
			if ( Object.keys( sourceParams ).length > 0 ) {
				const mappedParamNames = Object.keys( adaptedTransclusionDef.template.params );
				metadata.adapted = mappedParamNames.length > 0;
				const isEveryMandatoryParamMapped = mandatoryParams.every(
					( paramName ) => mappedParamNames.includes( paramName )
				);
				metadata.partial = !isEveryMandatoryParamMapped;
			} else {
				// There were no parameters to adapt
				metadata.adapted = true;
			}
			const optionalParams = mapper.getOptionalParamsForTarget();
			metadata.mandatoryTargetParams = mandatoryParams;
			metadata.optionalTargetParams = optionalParams;
		}

		return {
			formatForParsoid: () => adaptedTransclusionDef,
			getMetadata: () => metadata
		};
	}

	async getMappingFromDatabase( templateMappingDatabase, templateName, threshold = TEMPLATE_MAPPING_THRESHOLD_SCORE ) {
		const mapping = {};
		const db = await sqlite.open( {
			filename: templateMappingDatabase,
			driver: sqlite3.Database
		} );
		const results = await db.all(
			`SELECT source_param, target_param, score
			FROM mapping, templates
			WHERE mapping.template_mapping_id = templates.id
			AND templates.source_lang=?
			AND templates.target_lang=?
			AND templates.template=?
			AND mapping.score >= ?`,
			this.sourceLanguage, this.targetLanguage, templateName, threshold );
		if ( results ) {
			for ( let i = 0; i < results.length; i++ ) {
				mapping[ results[ i ].source_param ] = results[ i ].target_param;
			}
		}
		return mapping;
	}
}

module.exports = TemplateTransclusion;
