'use strict';

const { describe, it } = require( 'node:test' );
const fs = require( 'fs' );
const Adapter = require( '../../lib/Adapter' );
const MWApiRequestManager = require( '../../lib/mw/MWApiRequestManager' );
const TestClient = require( '../../lib/mt' ).TestClient;
const assert = require( 'node:assert/strict' );
const jsdom = require( 'jsdom' );
const { getConfig } = require( '../../lib/util.js' );

const testcase = {
	desc: 'section has lot of templates, but all are fragments of main template',
	from: 'en',
	to: 'es',
	source: 'section-1.html',
	adaptationCount: 1
};

describe( 'Adaptation tests', () => {
	const api = new MWApiRequestManager( getConfig() );

	it( 'should adapt section when: ' + testcase.desc, async () => {

		getConfig().mtClient = new TestClient( getConfig() );
		const adapter = new Adapter( testcase.from, testcase.to, api, getConfig() );
		const testData = fs.readFileSync( __dirname + '/data/' + testcase.source, 'utf8' );
		const result = await adapter.adapt( testData );
		const resultDom = new jsdom.JSDOM( result.getHtml() );
		const elementWithDataCX = resultDom.window.document.querySelectorAll( '[data-cx]' );
		assert.deepEqual( elementWithDataCX.length, testcase.adaptationCount );
	} );
} );
