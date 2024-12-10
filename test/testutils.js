import { existsSync, writeFileSync } from 'fs';

class TestUtils {
	constructor( api ) {
		this.api = api;
	}

	setup( mocks ) {
		this.api.clearCaches();
		this.api.setRequestCache( new Map() );
		if ( existsSync( 'DUMPREQUESTS' ) ) {
			return;
		}

		this.api.loadCachedRequests( mocks );
		this.api.enableOfflineMode();
	}

	dump( filename ) {
		if ( existsSync( 'DUMPREQUESTS' ) ) {
			this.api.dumpCachedRequests().then( ( result ) => {
				writeFileSync( filename, JSON.stringify( result, null, 4 ) );
				this.api.clearCaches();
			} );
		} else {
			this.api.clearCaches();
		}
	}
}

export default TestUtils;
