var Q = require( 'q' ),
	LinearDoc = require( '../lineardoc/LinearDoc' ),
	Entities = require( 'html-entities' ).AllHtmlEntities,
	logger = require( '../utils/Logger.js' ),
	spawn = require( 'child_process' ).spawn,
	// TODO: Tokenize properly. These work for English/Spanish/Catalan
	TOKENS = /[\wáàçéèíïóòúüñÁÀÇÉÈÍÏÓÒÚÜÑ]+(?:[·'][\wáàçéèíïóòúüñÁÀÇÉÈÍÏÓÒÚÜÑ]+)?|[^\wáàçéèíïóòúüñÁÀÇÉÈÍÏÓÒÚÜÑ]+/g,
	IS_WORD = /^[\wáàçéèíïóòúüñÁÀÇÉÈÍÏÓÒÚÜÑ]+(?:[·'][\wáàçéèíïóòúüñÁÀÇÉÈÍÏÓÒÚÜÑ]+)?$/;

function getTokens( text ) {
	// TODO: implement for other languages than English/Spanish/Catalan
	return text.match( TOKENS ).map( function ( tokenText ) {
		return {
			text: tokenText,
			isWord: !!tokenText.match( IS_WORD )
		};
	} );
}

function getRangedText( text ) {
	var i = 0;
	return getTokens( text ).map( function ( token ) {
		return '<span id="mtToken' + ( i++ ) + '">' +
			LinearDoc.esc( token.text ) +
			'</span>';
	} ).join( '' );
}

function readRangedText( text ) {
	var i, len, part, match, partText,
		offset = 0,
		ranges = {},
		entities = new Entities(),
		parts = text.match( /<span id="mtToken\d+">[^<>]+<\/span>/g );
	for ( i = 0, len = parts.length; i < len; i++ ) {
		part = parts[ i ];
		match = part.match( /^<span id="mtToken(\d+)">([^<>]+)<\/span>$/ );
		if ( !match ) {
			console.warn( 'Bad part: "' + part + '"' );
			continue;
		}
		partText = entities.decode( match[ 2 ] );
		ranges[ match[ 1 ] ] = {
			text: partText,
			start: offset,
			length: partText.length
		};
		offset += partText.length;
	}
	return ranges;
}

function getTextAndRangeMappings( rangedSourceText, rangedTargetText ) {
	var sourceParts, targetParts, ids, i, len, id,
		targetTextParts = [],
		rangeMappings = [];
	sourceParts = readRangedText( rangedSourceText );
	targetParts = readRangedText( rangedTargetText );
	ids = Object.keys( sourceParts );
	ids.sort( function ( x, y ) {
		return parseInt( x ) - parseInt( y );
	} );
	for ( i = 0, len = ids.length; i < len; i++ ) {
		id = ids[ i ];
		if ( targetParts[ id ] === undefined ) {
			continue;
		}
		rangeMappings.push( {
			source: sourceParts[ id ],
			target: targetParts[ id ]
		} );
		targetTextParts.push( targetParts[ id ].text );
	}
	return {
		text: targetTextParts.join( '' ),
		rangeMappings: rangeMappings
	};
}

/**
 * Translate the text
 * @param {string} sourceLang Source language code
 * @param {string} targetLang Target language code
 * @param {string} sourceText Source plain text
 * @return {Object} Deferred promise: Translated plain text
 */
function translateText( sourceLang, targetLang, sourceText ) {
	var apertium, rangedSourceText, rangedTargetText,
		rangedTargetTextData = [],
		deferred = Q.defer();
	rangedSourceText = getRangedText( sourceText );
	apertium = spawn(
		'python', [ 'mt/apertium.py', sourceLang + '-' + targetLang, '-u', '-f', 'html' ], {
			stdio: 'pipe',
			env: {
				PATH: process.env.PATH,
				LC_ALL: 'en_US.utf8'
			}
		}
	);
	apertium.stderr.on( 'data', function ( data ) {
		logger.error( data );
	} );
	apertium.stdout.on( 'data', function ( data ) {
		rangedTargetTextData.push( '' + data );
	} );
	apertium.on( 'close', function ( code ) {
		if ( code !== 0 ) {
			deferred.reject( new Error( '' + code ) );
			return;
		}
		rangedTargetText = rangedTargetTextData.join( '' );
		deferred.resolve( getTextAndRangeMappings( rangedSourceText, rangedTargetText ) );
	} );
	apertium.stdin.write( rangedSourceText );
	apertium.stdin.end();
	return deferred.promise;
}

/**
 * Translate marked up text relying on the MT engine
 * @param {string} sourceLang Source language code
 * @param {string} targetLang Target language code
 * @param {string} sourceHtml Source rich text
 * @return {Object} Deferred promise: Translated rich text
 */
function translateHtmlWithNativeMarkup( sourceLang, targetLang, sourceHtml ) {
	var apertium,
		translation = '',
		deferred = Q.defer();
	apertium = spawn(
		'apertium', [ sourceLang + '-' + targetLang, '-u', '-f', 'html' ], {
			stdio: 'pipe',
			env: {
				PATH: process.env.PATH,
				LC_ALL: 'en_US.utf8'
			}
		}
	);
	apertium.stderr.on( 'data', function ( data ) {
		logger.error( data );
	} );
	apertium.stdout.on( 'data', function ( data ) {
		translation += data;
	} );
	apertium.on( 'close', function ( code ) {
		if ( code !== 0 ) {
			deferred.reject( new Error( '' + code ) );
			return;
		}
		deferred.resolve( translation );
	} );
	apertium.stdin.write( sourceHtml );
	apertium.stdin.end();
	return deferred.promise;
}

/**
 * Translate marked-up text
 * @param {string} sourceLang Source language code
 * @param {string} targetLang Target language code
 * @param {string} sourceText Source html
 * @return {Object} Deferred promise: Translated html
 */
function translateHtml( sourceLang, targetLang, sourceHtml ) {
	var i, len, sourceDoc, targetDoc, itemPromises, deferred,
		parser = new LinearDoc.Parser();
	parser.init();
	parser.write( sourceHtml );
	sourceDoc = parser.builder.doc;
	// Clone and adapt sourceDoc
	targetDoc = new LinearDoc.Doc( sourceDoc.wrapperTag );
	itemPromises = [];
	for ( i = 0, len = sourceDoc.items.length; i < len; i++ ) {
		/*jshint loopfunc:true */
		( function ( deferred, item ) {
			itemPromises.push( deferred.promise );
			if ( item.type !== 'textblock' ) {
				deferred.resolve( item );
				return;
			}
			translateText( sourceLang, targetLang, item.item.getPlainText() ).then( function ( translated ) {
				var newTextBlock;
				try {
					newTextBlock = item.item.translateAnnotations(
						translated.text, translated.rangeMappings
					);
					deferred.resolve( {
						type: 'textblock',
						item: newTextBlock
					} );
				} catch ( ex ) {
					deferred.reject( ex );
				}
			} );
		}( Q.defer(), sourceDoc.items[ i ] ) );
	}
	deferred = Q.defer();
	Q.all( itemPromises ).spread( function () {
		targetDoc.items = Array.prototype.slice.call( arguments, 0 );
		return deferred.resolve( targetDoc.getHtml() );
	} );
	return deferred.promise;
}

module.exports = {
	translateHtmlWithNativeMarkup: translateHtmlWithNativeMarkup,
	translateHtml: translateHtml,
	translateText: translateText
};
