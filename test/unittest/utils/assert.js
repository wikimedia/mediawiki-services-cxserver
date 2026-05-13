import assert from 'node:assert/strict';
const { JSDOM } = await import( 'jsdom' );

function deepEqual( result, expected, message ) {

	try {
		if ( typeof expected === 'string' ) {
			assert.ok( result === expected || ( new RegExp( expected ).test( result ) ) );
		} else {
			assert.deepEqual( result, expected, message );
		}
	} catch ( e ) {
		console.log( 'Expected:\n' + JSON.stringify( expected, null, 2 ) );
		console.log( 'Result:\n' + JSON.stringify( result, null, 2 ) );
		throw e;
	}

}

/**
 * Asserts whether the return status was as expected
 *
 * @param {Object} res
 * @param {string} expected
 */
function status( res, expected ) {

	assert.deepEqual( res.status, expected,
		'Expected status to be ' + expected + ', but was ' + res.status );

}

/**
 * Asserts whether content type was as expected
 *
 * @param {Object} res
 * @param {string} expected
 */
function contentType( res, expected ) {

	const actual = res.headers[ 'content-type' ];
	assert.deepEqual( actual, expected,
		'Expected content-type to be ' + expected + ', but was ' + actual );

}

function notDeepEqual( result, expected, message ) {

	try {
		assert.notDeepEqual( result, expected, message );
	} catch ( e ) {
		console.log( 'Not expected:\n' + JSON.stringify( expected, null, 2 ) );
		console.log( 'Result:\n' + JSON.stringify( result, null, 2 ) );
		throw e;
	}

}

function fails( promise, onRejected ) {

	let failed = false;

	function trackFailure( e ) {
		failed = true;
		return onRejected( e );
	}

	function check() {
		if ( !failed ) {
			throw new Error( 'expected error was not thrown' );
		}
	}

	return promise.catch( trackFailure ).then( check );

}

function compareHTML( actual, expected, message ) {
	const domActual = new JSDOM( actual ).window.document.body;
	const domExpected = new JSDOM( expected ).window.document.body;
	const result = domActual.isEqualNode( domExpected );
	if ( result === false ) {
		// The DOM nodes are not equal, so do a deepEqual to output the actual/expected content
		assert.deepEqual( actual, expected, message || 'HTML content does not match' );
	} else {
		assert.deepEqual( result, true, message || 'HTML content does not match' );
	}
}

export {
	deepEqual,
	notDeepEqual,
	fails,
	status,
	contentType,
	compareHTML
};
