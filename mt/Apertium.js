var Q = require( 'q' ),
	util = require( 'util' ),
	request = require( 'request' ),
	conf = require( __dirname + '/../utils/Conf.js' ),
	LinearDoc = require( '../lineardoc/LinearDoc' ),
	MTClient = require( './MTClient.js' ),
	apertiumLangMapping = require( './Apertium.languagenames.json' );

function Apertium() {

}

util.inherits( Apertium, MTClient );
/**
 * Translate marked-up text
 * @param {string} sourceLang Source language code
 * @param {string} targetLang Target language code
 * @param {string} sourceText Source html
 * @return {Object} Deferred promise: Translated html
 */
Apertium.prototype.translate = function ( sourceLang, targetLang, sourceHtml ) {
	var i, len, sourceDoc, targetDoc, itemPromises, deferred,
		apertium = this,
		parser = new LinearDoc.Parser();

	parser.init();
	parser.write( sourceHtml );
	sourceDoc = parser.builder.doc;
	// Clone and adapt sourceDoc
	targetDoc = new LinearDoc.Doc( sourceDoc.wrapperTag );
	itemPromises = [];
	function translateItemDeferred( deferred, item ) {
		itemPromises.push( deferred.promise );
		if ( item.type !== 'textblock' ) {
			deferred.resolve( item );
			return;
		}
		apertium.translateTextWithTagOffsets(
			sourceLang,
			targetLang,
			item.item.getPlainText(),
			item.item.getTagOffsets()
		).then( function ( translated ) {
			var newTextBlock;
			try {
				newTextBlock = item.item.translateTags(
					translated.text, translated.rangeMappings
				);
				deferred.resolve( {
					type: 'textblock',
					item: newTextBlock
				} );
			} catch ( ex ) {
				deferred.reject( ex );
			}
		}, function ( error ) {
			deferred.reject( error );
		} );
	}
	for ( i = 0, len = sourceDoc.items.length; i < len; i++ ) {
		translateItemDeferred( Q.defer(), sourceDoc.items[ i ] );
	}
	deferred = Q.defer();
	Q.all( itemPromises ).spread( function () {
		targetDoc.items = Array.prototype.slice.call( arguments, 0 );
		deferred.resolve( targetDoc.getHtml() );
	}, function ( error ) {
		deferred.reject( error );
	} );

	return deferred.promise;
};

/**
 * Translate text, using case variants to map tag offsets
 * @param {string} sourceLang Source language code
 * @param {string} targetLang Target language code
 * @param {string} sourceText Source plain text
 * @param {Object[]} tagOffsets start and length for each annotation chunk
 * @return {Object} Deferred promise: Translated plain text and range mappings
 */
Apertium.prototype.translateTextWithTagOffsets = function ( sourceLang, targetLang, sourceText, tagOffsets ) {
	var sourceVariants, sourceLines, m, preSpace, postSpace, trimmedSourceLines, deferred,
		self = this;

	sourceVariants = this.getCaseVariants( sourceLang, sourceText, tagOffsets );
	sourceLines = sourceVariants.map( function ( variant ) {
		return variant.text;
	} );
	sourceLines.splice( 0, 0, sourceText );

	// Don't push leading and trailing whitespace through Apertium
	m = sourceText.match( /^(\s*).*?(\s*)$/ );
	preSpace = m[ 1 ];
	postSpace = m[ 2 ];
	trimmedSourceLines = sourceLines.map( function ( line ) {
		return line.substring( preSpace.length, line.length - postSpace.length );
	} );

	deferred = Q.defer();
	// Join segments with a string that will definitely break sentences and be preserved
	self.translateLines(
		sourceLang,
		targetLang,
		trimmedSourceLines
	).then( function ( trimmedTargetLines ) {
		var targetLines, targetText, rangeMappings;

		targetLines = trimmedTargetLines.map( function ( trimmedTargetLine ) {
			return preSpace + trimmedTargetLine + postSpace;
		} );

		try {
			targetText = targetLines.splice( 0, 1 )[ 0 ];
			rangeMappings = self.getRangeMappings(
				targetLang,
				sourceVariants,
				targetText,
				targetLines
			);
		} catch ( ex ) {
			deferred.reject( ex );
			return;
		}
		deferred.resolve( {
			text: targetText,
			rangeMappings: rangeMappings
		} );
	}, function ( error ) {
		deferred.reject( error );
	} );

	return deferred.promise;
};

/**
 * Translate multiple lines of plaintext with apertium
 * @param {string} sourceLang Source language code
 * @param {string} targetLang Target language code
 * @param {string[]} sourceLines Source plaintext lines
 * @return {Object} Deferred promise: Translated plaintext lines
 */
Apertium.prototype.translateLines = function ( sourceLang, targetLang, sourceLines ) {
	var sourceLinesText,
		deferred = Q.defer();

	// Join lines into single string. Separator must break sentences and pass through unchanged
	sourceLinesText = sourceLines.join( '\n.CxServerApertium.\n' );

	this.translateText(
		sourceLang,
		targetLang,
		sourceLinesText
	).then( function ( targetLinesText ) {
		var targetText = targetLinesText
			.replace( /^\s+|\s+$/g, '' )
			.split( /\n\.CxServerApertium\.\n/g );
		deferred.resolve( targetText );
	}, function ( error ) {
		deferred.reject( error );
	} );
	return deferred.promise;
};

/**
 * Translate plain text with Apertium API
 * @param {string} sourceLang Source language code
 * @param {string} targetLang Target language code
 * @param {string} sourceText Source language text
 * @return {Object} Deferred promise: Target language text
 */
Apertium.prototype.translateText = function ( sourceLang, targetLang, sourceText ) {
	var deferred = Q.defer(),
		postData;

	postData = {
		url: conf( 'mt.apertium.api' ) + '/translate',
		form: {
			markUnknown: 0,
			langpair: apertiumLangMapping[ sourceLang ] + '|' + apertiumLangMapping[ targetLang ],
			format: 'txt',
			q: sourceText
		}
	};
	request.post( postData,
		function ( error, response, body ) {
			var message;

			if ( error ) {
				deferred.reject( new Error( error ) );
				return;
			}
			if ( response.statusCode !== 200 ) {
				message = 'Error ' + response.statusCode;
				message += ' sourceText={' + sourceText + '}, body={' + body + '}';
				deferred.reject( new Error( message ) );
				return;
			}
			deferred.resolve( JSON.parse( body ).responseData.translatedText );
		}
	);
	return deferred.promise;
};

module.exports = Apertium;
