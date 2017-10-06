'use strict';

const fs = require( 'fs' );

class TestUtils {
	constructor( api ) {
		this.api = api;
	}

	setup( mocks ) {
		if ( fs.existsSync( 'DUMPREQUESTS' ) ) {
			return;
		}

		this.api.loadCachedRequests( mocks );
		this.api.enableOfflineMode();
	}

	dump( filename ) {
		if ( fs.existsSync( 'DUMPREQUESTS' ) ) {
			this.api.dumpCachedRequests().then( ( result ) => {
				fs.writeFile( filename, JSON.stringify( result, null, 4 ) );
			} );
		}
	}
}

module.exports = TestUtils;
