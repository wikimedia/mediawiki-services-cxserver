var conf = require( __dirname + '/../utils/Conf.js' ),
	registry = conf( 'registry' );

/**
 * Get the available toolset for the given language pair
 * @param {string} from source language
 * @param {string} to target language
 * @return {Object} the toolset (empty object if nothing available)
 */
function getToolSet( from, to ) {
	return ( registry[ from ] || {} )[ to ] || {};
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
		if ( toolset[ serviceType ].providers.indexOf( providerName ) === -1 ) {
			// The requested provider doesn't appear in the registry,
			// so it's invalid
			return false;
		}

		// The provider is valid
		return providerName;
	}

	// If provider not given, use the first one in the registry
	return toolset[ serviceType ].providers[ 0 ];
}

module.exports = {
	getToolSet: getToolSet,
	getValidProvider: getValidProvider
};
