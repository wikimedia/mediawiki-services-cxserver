/*jshint browser:true, jquery:true */
( function ( $ ) {
	'use strict';

	$( document ).ready( function () {
		$( 'progress' ).hide();
		$( 'button' ).click( function () {
			$( 'progress' ).show();
			$( '.status' ).text( 'Connecting to server...' );
			var sourceHtml = $( 'textarea[name=sourceHtml]' ).val(),
				sourceLanguage = $( 'input[name=sourceLanguage]' ).val(),
				targetLanguage = $( 'input[name=targetLanguage]' ).val(),
                url = '/mt/' + sourceLanguage + '/' + targetLanguage + '/' + encodeURIComponent( sourceHtml );
			$.get( url, function ( response ) {
				$( '.targetHtmlRaw' ).text( response );
				$( '.targetHtmlRendered' ).html( response );
				$( 'progress' ).hide();
			} );
		} );
	} );
}( jQuery ) );
