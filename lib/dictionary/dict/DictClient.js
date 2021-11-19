'use strict';

/**
 * Dict dictionary protocol client as per RFC 2229
 * Credits:
 *    Dict client implementation borrowed from: https://github.com/ptrm/dict.json
 *    Copyright (c) 2010 Piotrek Marciniak <piotrek@ptrm.eu>, MIT Style License
 * RFC 2229: http://www.dict.org/rfc2229.txt
 */

const net = require( 'net' );
const config = {
	dictd: {
		port: '2628',
		host: '127.0.0.1',
		timeout: 700
	},
	db: '!' // First match
};

function firstObj( list ) {
	let obj = null;

	if ( typeof list !== 'object' ) {
		return null;
	}
	// eslint-disable-next-line no-unreachable-loop
	for ( const idx in list ) {
		obj = list[ idx ];
		break;
	}

	return obj;
}

/**
 * Sanitize the words
 *
 * @param {Object} words
 * @return {Object} result
 */
function parseWords( words ) {
	const res = {};
	let count = 0;

	for ( const i in words ) {
		if ( typeof words[ i ].word !== 'string' ) {
			continue;
		}
		// cleanup the word by removing traling new line characters
		const word = words[ i ].word.replace( /["\r\n]/g, '' ).trim().toLowerCase();

		const db = [];
		if ( words[ i ].db ) {
			if ( typeof words[ i ].db !== 'object' ) {
				words[ i ].db = new Array( words[ i ].db );
			}
			for ( const dbIdx in words[ i ].db ) {
				const nDb = words[ i ].db[ dbIdx ];
				// cleanup the db name by removing traling new line characters
				db.push( nDb.replace( /["\r\n]/g, '' ).trim().toLowerCase() );
			}
		}

		if ( !db.length ) {
			db.push( config.db );
		}
		if ( word ) {
			res[ word ] = {
				db: db
			};
			count++;
		}
	}

	res.count = count;

	return res;
}

function getDefs( words, options ) {
	let defs = {},
		suggestions = {},
		reqQueue = [],
		sentReqs = [],
		reqOnDrain = false,
		currentReqIdx = -1,
		currentReq = {},
		textBuf = '',
		textEnded = true,
		dbDesc = '',
		dbName = '',
		status = '';

	// Create a connection to the dict host and port
	const dict = net.createConnection( config.dictd.port, config.dictd.host );
	dict.setTimeout( config.dictd.timeout );
	dict.setEncoding( 'utf8' );

	if ( typeof options !== 'object' ) {
		options = {};
	}

	dict.on( 'timeout', function () {
		options.error( 'error', 'Timeout' );
		dict.end();
	} );

	dict.on( 'end', function () {
		dict.end();
	} );

	dict.on( 'connect', function () {
		// put requests to queue
		for ( const word in words ) {
			if ( word === 'count' ) {
				continue;
			}
			defs[ word ] = [];
			for ( const dbIdx in words[ word ].db ) {
				const db = words[ word ].db[ dbIdx ];
				const req = 'd ' + db + ' "' + word + '"\r\n';
				reqQueue.push( {
					request: req,
					word: word,
					type: 'def',
					db: db
				} );
			}

		}
	} );

	function nextRequest() {
		let req, i;
		reqOnDrain = false;

		// check whether all responses arrived and if there are requests to be sent
		if ( ( currentReqIdx + 1 < sentReqs.length ) || reqQueue.length ) {
			if ( !dict.writable ) {
				reqOnDrain = true;
				return;
			}

			// Send the all pending requests at once. It increases performance when
			// using remote dict server, and is encouraged by the RFC.
			req = '';
			for ( i in reqQueue ) {
				req = req + reqQueue[ i ].request;
			}

			sentReqs = sentReqs.concat( reqQueue );
			reqQueue = [];
			currentReqIdx++;
			currentReq = sentReqs[ currentReqIdx ];

			if ( req.trim() ) {
				dict.write( req );
			}
		} else { // if not, send the quit message
			currentReq = {
				request: 'q\r\n'
			};
			dict.end( currentReq.request );
		}
	}

	dict.on( 'drain', function () {
		if ( !reqOnDrain ) {
			return;
		}
		nextRequest();
	} );

	dict.on( 'data', function ( data ) {
		let idx, definition, header, nextResponsePos = -2,
			sug, sugLines, lNum, word,
			response = '';

		if ( typeof data !== 'string' ) {
			return;
		}

		/*
        To understand the response handling code, an example response is given below.
            C: DEFINE * shortcake
            -----------------
            S: 150 2 definitions found: list follows
            S: 151 "shortcake" wn "WordNet 1.5" : text follows
            S: shortcake
            S:   1. n: very short biscuit spread with sweetened fruit and usu.
            S:      whipped cream
            S: .
            S: 151 "Shortcake" web1913 "Webster's Dictionary (1913)" : text follows
            S: Shortcake
            S:    \Short"cake`\, n.
            S:    An unsweetened breakfast cake shortened with butter or lard,
            S:    rolled thin, and baked.
            S: .
            S: 250 Command complete
        */
		function nextResponse() {
			if ( textEnded ) {
				nextResponsePos = data.search( /\r\n[0-9]{3}/ );
			} else {
				nextResponsePos = data.search( /\r\n\.(\r\n|$)/ );
			}

			if ( nextResponsePos !== -1 ) {
				response = data.slice( 0, nextResponsePos );
				// + 2 for \r\n
				data = data.slice( nextResponsePos + 2 );
			} else {
				response = data;
			}
			if ( textEnded ) {
				status = response.slice( 0, 3 );
			} else {
				textEnded = ( nextResponsePos > -1 );
			}

		}

		while ( ( nextResponsePos !== -1 ) && ( nextResponsePos !== 0 ) ) {
			if ( textEnded ) {
				// reset state variables
				textBuf = '';
				status = '';
				response = '';
				nextResponse();
			}
			// Continuing previous data
			/* eslint-disable no-fallthrough */
			switch ( status ) {
				// greetings
				case '220':
					// we can start the fun now
					nextRequest();
					break;

					// bye
				case '221':
					// onEnd event should follow, so no need to do anything here
					break;

					// a couple of errors on which we should close
					// temorarily unavailable
				case '420':
					// Server temporarily unavailable
				case '421':
					// Server shutting down at operator request
					options.error( 'error', 'Error code ' + status );
					return;
					// no match
				case '552':
					// provide suggestions?
					// checking request type, because server gives the same not found code
					// for suggestions as for words also checking whether db isn't on ignore list
					if ( ( currentReq.type === 'def' ) && options.suggestions ) {
						reqQueue.push( {
							request: 'match ' + currentReq.db + ' lev "' + currentReq.word + '"\r\n',
							type: 'sug',
							word: currentReq.word
						} );
					}
					nextRequest();
					break;

					// a couple of errors on which we might try to continue
					// syntax error, command not recognized
				case '500':
					// Syntax error, command not recognized
				case '501':
					// Syntax error, illegal parameters
				case '502':
					// Command not implemented
				case '503':
					// Command parameter not implemented
				case '550':
					// invalid strategy
				case '551':
					// Proceeding to next request at status
					nextRequest();
					break;

					// suggestions
				case '152':
					word = currentReq.word;

					if ( textEnded ) {
						// first line is the status message:
						idx = response.indexOf( '\r\n' );
						if ( idx === -1 ) {
							break;
						}
						header = response.slice( 0, idx );
						response = response.slice( idx + 2 );
						textBuf = response;
						textEnded = response.match( /\r\n\.(\r\n|$)/ );
						// If textEnded is false, suggestions did not end
					} else {
						nextResponse();
						textBuf = textBuf.concat( response );
					}

					if ( textEnded ) {
						// Example suggestion response:
						// 152 7 matches found: list follows
						// dbname suggestion1
						// dbname suggestion2
						// Remove the "." ending the text message.
						sugLines = textBuf.replace( /\r\n\.(\r\n|$)/, '' ).split( '\r\n' );
						// That removed the first line too.
						if ( !suggestions[ word ] ) {
							// initialize the object
							suggestions[ word ] = [];
						}

						for ( lNum in sugLines ) {
							if ( !sugLines[ lNum ].trim() ) {
								continue;
							}
							// remove the first word in the line because it is db name
							sug = sugLines[ lNum ].replace( /^[a-zA-Z0-9]+ "([^"]+)".*/, '$1' );
							if ( !suggestions[ word ].includes( sug ) ) {
								suggestions[ word ].push( sug );
							}
						}
						// Suggestions ended
					}
					break;

					// ok
				case '250':
					nextRequest();
					break;

					// definition
				case '151':
					// word database name - text follows
					// textEnded, so we are free to start anew
					if ( textEnded ) {
						// first line is the status message:
						idx = response.indexOf( '\r\n' );
						if ( idx === -1 ) {
							break;
						}
						header = response.slice( 0, idx );
						response = response.slice( idx + 2 );

						word = header.replace( /[0-9]{3} "([^"]*)".*/, '$1' ).toLowerCase();
						dbName = header.replace( /[0-9]{3} "[^"]*" (\w+)\b.*/, '$1' );
						dbDesc = header.replace( /[0-9]{3} "[^"]*".*"([^"]*)"/, '$1' );

						textBuf = response;

						textEnded = response.match( /\r\n\.(\r\n|$)/ );
						// If textEnded is false, definition did not end
					} else {
						nextResponse();
						textBuf = textBuf.concat( response );
					}

					if ( textEnded ) {
						// ".." On the beggining of a new line means "."
						// We also remove the "." ending the text message.
						definition = textBuf.replace( /^\.\./m, '.' ).replace( /\r\n\.(\r\n|$)/, '' );

						// Definition ended.

						if ( typeof defs[ currentReq.word ] !== 'object' ) {
							defs[ currentReq.word ] = [];
						}
						defs[ currentReq.word ].push( {
							def: definition,
							db: {
								name: dbName,
								desc: dbDesc
							}
						} );

					}
					break;
			}
			/* eslint-enable no-fallthrough */
		}
	} );

	dict.on( 'close', function () {
		if ( options.action === 'def' ) {
			defs = firstObj( defs ) || [];

			if ( options.suggestions ) {
				suggestions = firstObj( suggestions ) || [];
			}
		}

		const data = {
			definitions: defs
		};

		if ( options.suggestions ) {
			data.suggestions = suggestions;
		}
		options.success( data );
	} );
}

/**
 * Search for the definition of a word
 *
 * @param {string|Array} word
 * @param {Object} options
 */
function lookup( word, options ) {
	let wordList = [];
	const action = options.action || 'def';

	switch ( action ) {
		case 'def':
			wordList = [ {
				word: word,
				db: options.db || config.db
			} ];
			break;

		case 'multi':
			wordList = word;
			break;

		default:
			options.error( 'error', 'Wrong action given.' );
			return;
	}

	// Sanitize the wordList
	const words = parseWords( wordList );
	if ( words.count ) {
		getDefs( words, {
			action: options.action,
			suggestions: !!options.suggestions,
			error: options.error,
			success: options.success
		} );
	}
}

module.exports.lookup = lookup;
