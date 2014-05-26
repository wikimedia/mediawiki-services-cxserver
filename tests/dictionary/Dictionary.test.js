QUnit.module( 'Dictioanary' );

QUnit.test( 'Dictionary tests', function ( assert ) {
	QUnit.stop();
	CX.Dictionary.JsonDict.getTranslations( 'you', 'en', 'es' ).then( function ( result ) {
		assert.strictEqual( result.source, 'you',
			'Result contains the given word' );
		assert.strictEqual( result.translations.length, 5,
			'Found 5 results' );
		QUnit.start();
	} );
	QUnit.stop();
	CX.Dictionary.JsonDict.getTranslations( 'this_word_does_not_exist', 'en', 'es' )
		.then( function ( result ) {
			assert.strictEqual( result.translations.length, 0, 'Found 0 results' );
			QUnit.start();
		} );
} );
