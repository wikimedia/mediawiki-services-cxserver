'use strict';

const { describe, it, before } = require( 'node:test' );
const fs = require( 'fs' );
const Adapter = require( '../../lib/Adapter' );
const MWApiRequestManager = require( '../../lib/mw/MWApiRequestManager' );
const TestClient = require( '../../lib/mt' ).TestClient;
const assert = require( 'node:assert/strict' );
const jsdom = require( 'jsdom' );
const { getConfig } = require( '../../lib/util.js' );
const { initApp } = require( '../../app.js' );

const testcase = {
	desc: 'section has lot of templates, but all are fragments of main template',
	from: 'en',
	to: 'es',
	source: 'section-1.html',
	adaptationCount: 1
};

describe( 'Adaptation tests', () => {
	let app;

	before( async () => {
		app = await initApp( getConfig() );
	} );

	it( 'should adapt section when: ' + testcase.desc, async () => {
		const api = new MWApiRequestManager( app );
		app.mtClient = new TestClient( app );
		const adapter = new Adapter( testcase.from, testcase.to, api, app );
		const testData = fs.readFileSync( __dirname + '/data/' + testcase.source, 'utf8' );
		const result = await adapter.adapt( testData );
		const resultDom = new jsdom.JSDOM( result.getHtml() );
		const elementWithDataCX = resultDom.window.document.querySelectorAll( '[data-cx]' );
		assert.deepEqual( elementWithDataCX.length, testcase.adaptationCount );
	} );
} );
