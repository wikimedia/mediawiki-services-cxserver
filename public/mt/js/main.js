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
		var content = 'foo';
		translate( sourceLanguage, targetLanguage, content )
			.done( function () {
				$( '#' + sourceLanguage + '-' + targetLanguage ).text( 'OK' ).addClass( 'ok' );
				console.log( sourceLanguage + '-' + targetLanguage + ': OK' );
			} )
			.fail( function () {
				$( '#' + sourceLanguage + '-' + targetLanguage ).text( 'FAIL' ).addClass( 'fail' );
				console.log( sourceLanguage + '-' + targetLanguage + ': FAIL' );
			} );
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
