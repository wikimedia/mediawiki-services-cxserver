'use strict';

const assert = require( '../utils/assert.js' ),
	server = require( '../utils/server.js' ),
	Dictionary = require( '../../lib/dictionary' );

describe( 'JsonDict', function () {

	this.timeout( 20000 );

	it( 'should return result when looking up for an existing word', function () {
		return new Dictionary.JsonDict( server ).getTranslations( 'you', 'en', 'es' ).then( function ( result ) {
			assert.deepEqual( result.source, 'you',
				'Result contains the given word' );
			assert.deepEqual( result.translations.length, 5,
				'Found 5 results' );
		} );
	} );

	it( 'should return no result when looking up for an non existing word', function () {
		return new Dictionary.JsonDict( server ).getTranslations( 'this_word_does_not_exist', 'en', 'es' )
			.then( function ( result ) {
				assert.deepEqual( result.translations.length, 0, 'Found 0 results' );
			} );
	} );

} );
