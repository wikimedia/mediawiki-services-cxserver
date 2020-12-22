'use strict';

const fs = require( 'fs' );
const Adapter = require( '../../lib/Adapter' );
const MWApiRequestManager = require( '../../lib/mw/MWApiRequestManager' );
const TestClient = require( '../../lib/mt' ).TestClient;
const assert = require( 'assert' );
const jsdom = require( 'jsdom' );
const server = require( '../utils/server' );

const test = {
	desc: 'section has lot of templates, but all are fragments of main template',
	from: 'en',
	to: 'es',
	source: 'section-1.html',
	adaptationCount: 1
};

describe( 'Adaptation tests', () => {
	const api = new MWApiRequestManager( server.config );

	it( 'should adapt section when: ' + test.desc, function ( done ) {
		const cxserver = server.config.conf.services[ server.config.conf.services.length - 1 ];
		cxserver.conf.mtClient = new TestClient( cxserver );
		const adapter = new Adapter( test.from, test.to, api, cxserver );
		const testData = fs.readFileSync( __dirname + '/data/' + test.source, 'utf8' );
		adapter.adapt( testData ).then( ( result ) => {
			const resultDom = new jsdom.JSDOM( result.getHtml() );
			const elementWithDataCX = resultDom.window.document.querySelectorAll( '[data-cx]' );
			assert.deepEqual( elementWithDataCX.length, test.adaptationCount );
			done();
		} );
	} );
} );
