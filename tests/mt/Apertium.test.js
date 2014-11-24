QUnit.module( 'Apertium' );

var tests,
	Q = require( 'q' );

// In each case, below, just "source" and "textTranslations" should be sufficient for linearDoc
// to derive "target".  // The plaintext strings in "textTranslations" are real Apertium output.
// They are pre-cached (Apertium is not actually called during the test), so that:
// 1. Unit testing does not depend on Apertium
// 2. Tests will not break if an Apertium upgrade changes some translations
tests = [
	{
		title: 'All caps words',
		source: '<p>A <b>Japanese</b> <i>BBC</i> article</p>',
		target: '<p>Un artículo de <i>BBC</i> <b>japonés</b></p>',
		textTranslations: {
			'A Japanese BBC article': 'Un artículo de BBC japonés',
			BBC: 'BBC',
			Japanese: 'japonés'
		}
	},
	{
		title: 'Title caps one-to-many',
		source: '<div>A <b>modern</b> Britain.</div>',
		target: '<div>Una Gran Bretaña <b>moderna</b>.</div>',
		textTranslations: {
			'A modern Britain.': 'Una Gran Bretaña moderna.',
			modern: 'Moderno'
		}
	},
	{
		title: 'Reordering with nested tags',
		source: '<p>The <b>big <i>red</i></b> dog</p>',
		target: '<p>El perro <b><i>rojo</i></b> <b>grande</b></p>',
		textTranslations: {
			'The big red dog': 'El perro rojo grande',
			big: 'Grande',
			red: 'Rojo'
		}
	},
	{
		title: 'Many-to-one with nested tags',
		source: '<p>He said "<i>I tile <a href="x">bathrooms</a>.</i>"</p>',
		target: '<p>Diga que "<i>enladrillo</i> <i><a href="x">baños</a></i>."</p>',
		textTranslations: {
			'He said "I tile bathrooms."': 'Diga que "enladrillo baños."',
			'I tile': 'Enladrillo',
			bathrooms: 'Baños"'
		}
	},
	{
		title: 'Reordering at either ends of a tag',
		source: '<p>The <b>big red</b> dog</p>',
		target: '<p>El perro <b>rojo grande</b></p>',
		textTranslations: {
			'The big red dog': 'El perro rojo grande',
			'big red': 'Rojo grande'
		}
	},
	{
		title: 'Identical tags separated by whitespace',
		source: '<p>The <b>big</b> <b>red</b> dog</p>',
		target: '<p>El perro <b>rojo</b> <b>grande</b></p>',
		textTranslations: {
			'The big red dog': 'El perro rojo grande',
			big: 'Grande',
			red: 'Rojo'
		}
	},
	{
		title: 'Non-identical links separated by whitespace',
		source: '<p>The <a href="1">big</a> <a href="2">red</a> dog</p>',
		target: '<p>El perro <a href="2">rojo</a> <a href="1">grande</a></p>',
		textTranslations: {
			'The big red dog': 'El perro rojo grande',
			big: 'Grande',
			red: 'Rojo'
		}
	}
 ];

QUnit.test( 'Apertium wrapper tests', function ( assert ) {
	var textTranslations;

	// Fake the actual Apertium call
	CX.Apertium.prototype.translateLines = function ( sourceLang, targetLang, sourceLines ) {
		var deferred = Q.defer();

		setTimeout( function () {
			var targetLines;
			try {
				targetLines = sourceLines.map( function ( line ) {
					return textTranslations[ line ] || 'X' + line + 'X';
				} );
				deferred.resolve( targetLines );
			} catch ( error ) {
				deferred.reject( error );
			}
		} );
		return deferred.promise;
	};

	QUnit.expect( tests.length );

	function resumeTests( i ) {
		var test,
			apertium = new CX.Apertium();

		if ( i >= tests.length ) {
			return;
		}
		test = tests[ i ];
		textTranslations = test.textTranslations;

		QUnit.stop();
		apertium.translate( 'en', 'es', test.source ).then( function ( target ) {
			assert.strictEqual(
				target,
				test.target,
				test.title
			);
			QUnit.start();
			resumeTests( i + 1 );
		}, function ( error ) {
			assert.ok( false, test.title + ': ' + error );
			QUnit.start();
			resumeTests( i + 1 );
		} );
	}
	resumeTests( 0 );
} );
