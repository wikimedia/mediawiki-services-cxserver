/*jshint browser:true, jquery:true */
( function ( $ ) {
	'use strict';

	$( document ).ready( function () {
		$( 'progress' ).hide();
		$( 'button' ).click( function () {
			$( '.article' ).html( '' );
			$( 'progress' ).show();
			$( '.status' ).text( 'Connecting to server...' );
			var sourcePage = $( 'input[name=sourcePage]' ).val(),
				sourceLanguage = $( 'input[name=sourceLanguage]' ).val();
			$.get( 'page/' + sourceLanguage + '/' + sourcePage, function ( response ) {
				$( '.article' ).html( response.segmentedContent );
			} ).fail( function () {
				$( '.article' ).html( '<h1>Error</h1>' );
			} ).always( function () {
				$( 'progress' ).hide();
			} );
		} );
	} );
}( jQuery ) );
