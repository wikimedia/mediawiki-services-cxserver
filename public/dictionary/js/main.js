/*jshint browser:true, jquery:true */
( function ( $ ) {
	'use strict';

	function lookup() {
		$( '.definition' ).empty();
		var word = $( 'input[name=word]' ).val(),
			from = $( 'input[name=sourceLanguage]' ).val(),
			to = $( 'input[name=targetLanguage]' ).val();
		$.get( word + '/' + from + '/' + to, function ( response ) {
			if ( response.translations ) {
				$.each( response.translations, function ( index, translation ) {
					$( '.definition' ).append( translation.phrase );
					$( '.definition' ).append( '\n' );
					$( '.definition' ).append( translation.info );
					$( '.definition' ).append( '\n' );
				} );
			}
			if ( response.freetext ) {
				$.each( response.freetext, function ( index, freetext ) {
					$( '.definition' ).append( freetext.text );
					$( '.definition' ).append( '\n' );
					$( '.definition' ).append( freetext.sources );
					$( '.definition' ).append( '\n' );
				} );
			}
			$( 'progress' ).hide();
		} );
	}

	$( document ).ready( function () {
		$( 'button' ).click( lookup );
	} );
}( jQuery ) );
