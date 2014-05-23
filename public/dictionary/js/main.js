/*jshint browser:true, jquery:true */
( function ( $ ) {
	'use strict';

	$( document ).ready( function () {
		$( 'button' ).click( function () {
			$( '.definition' ).empty();
			var word = $( 'input[name=word]' ).val(),
				from = $( 'input[name=sourceLanguage]' ).val(),
				to = $( 'input[name=targetLanguage]' ).val();
			$.get( word + '/' + from + '/' + to, function ( response ) {
				$.each( response.translations, function ( index, translation ) {
					$( '.definition' ).append( translation.phrase );
					$( '.definition' ).append( '\n' );
					$( '.definition' ).append( translation.info );
					$( '.definition' ).append( '\n' );
				} );
				$( 'progress' ).hide();
			} );
		} );
	} );
}( jQuery ) );
