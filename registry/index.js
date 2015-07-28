var conf = require( __dirname + '/../utils/Conf.js' ),
	registry = conf( 'registry' );

/**
 * Return all language pairs.
 * @return {Object} The languages, indexed by source language
 *   pointing to a list of target languages.
 */
function getLanguagePairs() {
	return {
		source: registry.source,
		target: registry.target
	};
}

function getMTPairs() {
	return registry.mt;
}

function getDictionaryPairs() {
	return registry.dictionary;
}

/**
 * Get the available toolset for the given language pair
 * @param {string} from source language
 * @param {string} to target language
 * @return {Object} the toolset (empty object if nothing available)
 */
function getToolSet( from, to ) {
	var i, j, tool, tools, provider, providers, defaultProvider, result = {};

	// Known tools
	tools = [ 'mt', 'dictionary' ];

	for ( i = 0; i < tools.length; i++ ) {
		tool = registry[ tools[ i ] ];
		providers = Object.keys( tool );
		// If there is a default provider, add it to the beginning of array.
		if ( tool.defaults && tool.defaults[ from + '-' + to ] ) {
			defaultProvider = tool.defaults[ from + '-' + to ];
			result[ tools[ i ] ] = [ defaultProvider ];
		}
		for ( j = 0; j < providers.length; j++ ) {
			provider = tool[ providers[ j ] ];
			if ( provider[ from ] && provider[ from ].indexOf( to ) >= 0 &&
				defaultProvider !== providers[ j ]
			) {
				result[ tools[ i ] ] = result[ tools[ i ] ] || [];
				result[ tools[ i ] ].push( providers[ j ] );
			}
		}
	}

	return result;
}

/**
 * Get the available toolset for the given language pair.
 * If the provider name is given, it is validated.
 * If provider name is not given, the first one that appears in the registry will be returned.
 * If not valid provider is found, the function returns null.
 * @param {string} from source language
 * @param {string} to target language
 * @param {string} serviceType Service type from the registry, such as 'mt' or 'dictionary'
 * @param {string} providerName Optional - if given, it is validated.
 * @return {string} Provider name
 */
function getValidProvider( from, to, serviceType, providerName ) {
	var toolset = getToolSet( from, to );

	if ( !toolset[ serviceType ] ) {
		// No tools found for this service for this language pair
		return null;
	}

	if ( providerName ) {
		if ( toolset[ serviceType ].indexOf( providerName ) === -1 ) {
			// The requested provider doesn't appear in the registry,
			// so it's invalid
			return false;
		}

		// The provider is valid
		return providerName;
	}

	// If provider not given, use the first one in the registry
	return toolset[ serviceType ][ 0 ];
}

module.exports = {
	getLanguagePairs: getLanguagePairs,
	getMTPairs: getMTPairs,
	getDictionaryPairs: getDictionaryPairs,
	getToolSet: getToolSet,
	getValidProvider: getValidProvider
};
