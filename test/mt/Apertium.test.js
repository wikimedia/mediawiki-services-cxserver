'use strict';

var tests,
	assert = require( '../utils/assert.js' ),
	server = require( '../utils/server.js' ),
	BBPromise = require( 'bluebird' ),
	async = require( 'async' ),
	Apertium = require( '../../lib/mt' ).Apertium;

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
	},
	{
		title: 'Find longest match among multiple matches',
		source: '<p id="8"><span class="cx-segment" data-segmentid="9"><a class="cx-link" data-linkid="17" href="./The_New_York_Times" rel="mw:WikiLink" title="The New York Times">The New York Times</a>, which has an <b>executive editor</b> over the news pages and an <b>editorial page editor</b> over opinion pages.</span></p>',
		target: '<p id="8"><span data-segmentid="9" class="cx-segment"><a title="The New York Times" rel="mw:WikiLink" href="./The_New_York_Times" data-linkid="17" class="cx-link">The New York Times</a>, el cual tiene un <b>editor ejecutivo</b> sobre las páginas noticiosas y un <b>editor de página del editorial</b> encima páginas de opinión.</span></p>',
		textTranslations: {
			'The New York Times, which has an executive editor over the news pages and an editorial page editor over opinion pages.': 'The New York Times, el cual tiene un editor ejecutivo sobre las páginas noticiosas y un editor de página del editorial encima páginas de opinión.',
			'The New York Times': 'The New York Times',
			'executive editor': 'editor ejecutivo',
			'editorial page editor': 'editor de página del editorial'
		}
	}
];

describe( 'Apertium machine translation', function () {
	async.forEach( tests, function ( test ) {
		it( 'Test: ' + test.title, function () {
			var textTranslations, apertium;
			textTranslations = test.textTranslations;
			// Fake the actual Apertium call
			Apertium.prototype.translateLines = function ( sourceLang, targetLang, sourceLines ) {
				return BBPromise.delay( 0 ).then( function () {
					var targetLines;
					targetLines = sourceLines.map( function ( line ) {
						return textTranslations[ line ] || 'X' + line + 'X';
					} );
					return targetLines;
				} );
			};
			apertium = new Apertium( server );
			return apertium.translate( 'en', 'es', test.source ).then( function ( target ) {
				assert.deepEqual( target, test.target, test.title );
			} );
		} );
	} );
} );
