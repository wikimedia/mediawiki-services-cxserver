var registry = require( __dirname + '/Registry.json' );

/**
 * Get the available toolset for the given language pair
 * @param {string} from source language
 * @param {string} to target language
 * @return {Object} the toolset
 */
function getToolSet( from, to ) {
	return registry[ from ][ to ];
}
module.exports.getToolSet = getToolSet;
