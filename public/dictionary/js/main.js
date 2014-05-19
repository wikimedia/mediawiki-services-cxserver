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
				$.each( response.definitions, function ( index, definition ) {
					$( '.definition' ).append( definition.def );
					$( '.definition' ).append( '\n' );
					$( '.definition' ).append( definition.db.desc );
					$( '.definition' ).append( '\n\n' );
				} );
				$( 'progress' ).hide();
			} );
		} );
	} );
}( jQuery ) );
