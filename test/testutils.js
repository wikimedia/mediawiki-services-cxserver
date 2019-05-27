'use strict';

const fs = require( 'fs' );

class TestUtils {
	constructor( api ) {
		this.api = api;
	}

	setup( mocks ) {
		this.api.clearCaches();
		this.api.setRequestCache( new Map() );
		if ( fs.existsSync( 'DUMPREQUESTS' ) ) {
			return;
		}

		this.api.loadCachedRequests( mocks );
		this.api.enableOfflineMode();
	}

	dump( filename ) {
		if ( fs.existsSync( 'DUMPREQUESTS' ) ) {
			this.api.dumpCachedRequests().then( ( result ) => {
				fs.writeFileSync( filename, JSON.stringify( result, null, 4 ) );
				this.api.clearCaches();
			} );
		} else {
			this.api.clearCaches();
		}
	}
}

module.exports = TestUtils;
