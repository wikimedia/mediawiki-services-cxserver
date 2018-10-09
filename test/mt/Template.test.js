'use strict';

const assert = require( '../utils/assert.js' );
const server = require( '../utils/server.js' );
const TestClient = require( '../../lib/mt' ).TestClient;

const testSourceContent = `
<section id="cxTargetSection12" data-mw-cx-source="undefined">
    <span about="#mwt51" data-mw="{}"
        id="mwZw" typeof="mw:Transclusion" data-ve-no-generated-contents="true">
    </span>
    <link about="#mwt51" href="./Category:A" rel="mw:PageProp/Category" data-ve-ignore="true">
    <p about="#mwt51">This is not translated</p>
    <p>This is translated</p>
    <div about="#mwt7">This is not translated</div>
</section>
`;

describe( 'Template translation', () => {
	it( 'should not translate the fragement contents.', ( done ) => {
		const cxConfig = server.config.service;
		const testClient = new TestClient( cxConfig );
		testClient.translate( 'en', 'es', testSourceContent ).then( ( result ) => {
			assert.notDeepEqual( result.includes( '[en→es]This is not translated' ), true );
			assert.deepEqual( result.includes( '[en→es]This is translated' ), true );
			done();
		} );
	} );
} );
