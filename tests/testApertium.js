var caHtml, Apertium = require( '../mt/Apertium' );

caHtml = '<p>un dos <b><a href="3">tres</a> quatre <i><a href="5">cinc</a> sis set</i> vuit nou</b> deu</p>.';

Apertium.translateHtml( 'ca', 'es', caHtml ).then( function ( esHtml ) {
	console.log( 'caHtml:', caHtml );
	console.log( 'esHtml:', esHtml );
} );
