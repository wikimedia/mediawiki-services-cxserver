import { before, describe, it } from 'node:test';
import { readFileSync } from 'fs';
import { deepEqual } from 'node:assert/strict';
import { JSDOM } from 'jsdom';
import Adapter from '../../lib/Adapter.js';
import MWApiRequestManager from '../../lib/mw/MWApiRequestManager.js';
import { TestClient } from '../../lib/mt/index.js';
import { getConfig } from '../../lib/util.js';
import { initApp } from '../../app.js';

const dirname = new URL( '.', import.meta.url ).pathname;
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
		const testData = readFileSync( dirname + '/data/' + testcase.source, 'utf8' );
		const result = await adapter.adapt( testData );
		const resultDom = new JSDOM( result.getHtml() );
		const elementWithDataCX = resultDom.window.document.querySelectorAll( '[data-cx]' );
		deepEqual( elementWithDataCX.length, testcase.adaptationCount );
	} );
} );
