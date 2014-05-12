/*jshint browser:true, jquery:true */
( function ( $ ) {
	'use strict';

	$( document ).ready( function () {
		$( 'progress' ).hide();
		$( 'button' ).click( function () {
			$( 'progress' ).show();
			$( '.status' ).text( 'Connecting to server...' );
			var sourcePage = $( 'input[name=sourcePage]' ).val(),
				sourceLanguage = $( 'input[name=sourceLanguage]' ).val();
			$.get( 'page/' + sourceLanguage + '/' + sourcePage, function ( response ) {
				$( '.article' ).html( response.segmentedContent );
				$( 'progress' ).hide();
			} );
		} );
	} );
}( jQuery ) );
