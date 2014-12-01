/*jshint browser:true, jquery:true */
( function ( $ ) {
	'use strict';

	function translate( sourceLanguage, targetLanguage, content ) {
		var url = '/mt/' + sourceLanguage + '/' + targetLanguage;
		return $.post( url, content );
	}

	function translateHandler() {
		$( '.targetHtmlRaw' ).text( '' );
		$( '.targetHtmlRendered' ).html( '' );
		$( 'progress' ).show();
		var sourceHtml = $( 'textarea[name=sourceHtml]' ).val(),
			sourceLanguage = $( 'input[name=sourceLanguage]' ).val(),
			targetLanguage = $( 'input[name=targetLanguage]' ).val();
		translate( sourceLanguage, targetLanguage, sourceHtml )
			.done( function ( response ) {
				$( '.targetHtmlRaw' ).text( response );
				$( '.targetHtmlRendered' ).html( response );
			} ).fail( function () {
				$( '.targetHtmlRendered' ).html( '<h1>Error</h1>' );
			} ).always( function () {
				$( 'progress' ).hide();
			} );
	}

	function check( sourceLanguage, targetLanguage ) {
		var content = getTestContent( sourceLanguage, targetLanguage );

		translate( sourceLanguage, targetLanguage, content[ 0 ] )
			.done( function ( translation ) {
				if ( '<div>' + getTestContent( sourceLanguage, targetLanguage )[ 1 ] + '</div>' === translation ) {
					$( '#' + sourceLanguage + '-' + targetLanguage ).text( 'OK' ).addClass( 'ok' );
				} else {
					$( '#' + sourceLanguage + '-' + targetLanguage ).text( 'OK' );
				}
			} )
			.fail( function () {
				$( '#' + sourceLanguage + '-' + targetLanguage ).text( 'FAIL' ).addClass( 'fail' );
			} );
	}

	/*
	 * This test samples are based on sanity-test-apy.py file of Apertium-APY
	 */
	function getTestContent( sourceLanguage, targetLanguage ) {
		var samples = {
			'sh-en': [ 'jeziku', 'language' ],
			'hi-ur': [ 'लेख हैं', 'تحریر ہیں' ],
			'ur-hi': [ 'تحریر ہیں', 'लेख हैं' ],
			'af-nl': [ 'ek', 'ik' ],
			'ar-mt': [ 'و', 'u' ],
			'an-es': [ 'e', 'es' ],
			'es-an': [ 'la', 'a' ],
			'br-fr': [ 'Na', 'Ni' ],
			'bg-mk': [ 'аз', 'јас' ],
			'ca-en': [ 'Ens', 'Us' ],
			'ca-eo': [ 'Per', 'pt' ],
			'ca-fr': [ 'per', 'pour' ],
			'ca-oc': [ 'Tinc', 'Ai' ],
			'ca-pt': [ 'tinc', 'tenho' ],
			'ca-es': [ 'Jo', 'Yo' ],
			'cy-en': [ 'Yn', 'In' ],
			'da-sv': [ 'hvad', 'vad' ],
			'en-ca': [ 'us', 'ens' ],
			'en-eo': [ 'And', 'Kaj' ],
			'en-gl': [ 'Only', 'Só' ],
			'en-es': [ 'hello', 'hola' ],
			'eo-en': [ 'kaj', 'and' ],
			'eu-en': [ 'kaixo', 'hello' ],
			'eu-es': [ 'kaixo', 'hola' ],
			'fr-ca': [ 'pour', 'per' ],
			'fr-eo': [ 'Pour', 'pt' ],
			'fr-es': [ 'Je', 'Yo' ],
			'gl-en': [ 'Teño', 'Have' ],
			'gl-pt': [ 'teño', 'tenho' ],
			'gl-es': [ 'Teño', 'Tengo' ],
			'sh-sl': [ 'Slobodnu', 'Svobodnemu' ],
			'is-en': [ 'Grein', 'Article' ],
			'is-sv': [ 'af', 'av' ],
			'it-ca': [ 'è giusto dire', 'val a dir' ],
			'kk-tt': [ 'ол', 'ул' ],
			'mk-bg': [ 'јас', 'аз' ],
			'mk-en': [ 'триесет', 'thirty' ],
			'mt-ar': [ 'u', 'و' ],
			'nl-afr': [ 'ik', 'ek' ],
			'nn-da': [ 'kva', 'hvad' ],
			'nn-nb': [ 'korleis', 'hvorda' ],
			'nb-da': [ 'hva', 'hvad' ],
			'nb-nn': [ 'hvorda', 'korleis' ],
			'oc-ca': [ 'Mès tanben', 'Sinó també' ],
			'oc-es': [ 'Mès tanben', 'Sino también' ],
			'pt-ca': [ 'tenho', 'tinc' ],
			'pt-gl': [ 'tenho', 'teño' ],
			'pt-es': [ 'tenho', 'tengo' ],
			'ro-es': [ 'Liberă', 'Libre' ],
			'es-ca': [ 'yo', 'jo' ],
			'es-en': [ 'hola', 'hello' ],
			'es-eo': [ 'Tengo', 'Havas' ],
			'es-fr': [ 'Tengo', 'J\'ai' ],
			'es-gl': [ 'Tengo', 'Teño' ],
			'es-oc': [ 'Tengo', 'Ai' ],
			'es-pt': [ 'tengo', 'tenho' ],
			'sv-da': [ 'vad', 'hvad' ],
			'sv-is': [ 'Av', 'Af' ],
			'tt-kk': [ 'ул', 'ол' ]
		};
		return samples[ sourceLanguage + '-' + targetLanguage ] || [ 'കചടതപ', 'കചടതപ' ];
		// 'കചടതപ' is some string that Apertium does not know so that we get the same back.
	}

	function healthcheck() {
		$( 'table.mthealth' ).empty();
		$.get( '/languagepairs', function ( response ) {
			$.each( response, function ( source, targets ) {
				var $tr, sourceLanguage, targetLanguage, i;
				for ( i = 0; i < targets.length; i++ ) {
					sourceLanguage = source;
					targetLanguage = targets[ i ];
					$tr = $( '<tr>' ).append(
						$( '<td>' ).text( sourceLanguage ),
						$( '<td>' ).text( targetLanguage ),
						$( '<td>' ).attr( 'id', sourceLanguage + '-' + targetLanguage ).text( 'CHECKING' ).addClass( 'status' )
					);
					$( 'table.mthealth' ).append( $tr );
					check( sourceLanguage, targetLanguage );
				}
			} );
		} );
	}

	$( document ).ready( function () {
		$( 'progress' ).hide();
		$( 'button.translate' ).click( translateHandler );
		$( 'button.check' ).click( healthcheck );
	} );
}( jQuery ) );
