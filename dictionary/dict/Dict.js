var dictClient = require( __dirname + '/DictClient.js' ),
	dictRegistry = require( __dirname + '/DictRegistry.json' ),
	Q = require( 'q' );

function findDatabase( source, target ) {
	var dictionaries = dictRegistry[ source ] && dictRegistry[ source ][ target ];
	if ( !dictionaries ) {
		return null;
	}
	return Object.keys( dictionaries );
}

function getDefinition( word, from, to ) {
	var deferred = Q.defer();
	dictClient.lookup( word, {
		db: findDatabase( from, to ),
		action: 'def',
		suggestions: true,
		error: function ( responseCode, message ) {
			deferred.reject( responseCode + ': ' + message );
		},
		success: function ( data ) {
			deferred.resolve( data );
		}
	} );
	return deferred.promise;
}

module.exports.getDefinition = getDefinition;
