'use strict';

const { describe, it } = require( 'node:test' );
const fs = require( 'fs' );
const Adapter = require( '../../lib/Adapter' );
const MWApiRequestManager = require( '../../lib/mw/MWApiRequestManager' );
const TestClient = require( '../../lib/mt' ).TestClient;
const assert = require( 'node:assert/strict' );
const jsdom = require( 'jsdom' );
const server = require( '../utils/server' );

const testcase = {
	desc: 'section has lot of templates, but all are fragments of main template',
	from: 'en',
	to: 'es',
	source: 'section-1.html',
	adaptationCount: 1
};

describe( 'Adaptation tests', () => {
	const api = new MWApiRequestManager( server.config );

	it( 'should adapt section when: ' + testcase.desc, async () => {

		server.config.mtClient = new TestClient( server.config );
		const adapter = new Adapter( testcase.from, testcase.to, api, server.config );
		const testData = fs.readFileSync( __dirname + '/data/' + testcase.source, 'utf8' );
		const result = await adapter.adapt( testData );
		const resultDom = new jsdom.JSDOM( result.getHtml() );
		const elementWithDataCX = resultDom.window.document.querySelectorAll( '[data-cx]' );
		assert.deepEqual( elementWithDataCX.length, testcase.adaptationCount );
	} );
} );
