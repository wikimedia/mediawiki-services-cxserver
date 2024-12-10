import { describe, it } from 'node:test';
import { deepEqual, notDeepEqual } from '../utils/assert.js';
import { getConfig } from '../../lib/util.js';
import TestClient from '../../lib/mt/TestClient.js';

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
	it( 'should not translate the fragement contents.', async () => {
		const cxConfig = getConfig();
		const testClient = new TestClient( { conf: cxConfig } );
		const result = await testClient.translate( 'en', 'es', testSourceContent );
		notDeepEqual( result.includes( '[en→es]This is not translated' ), true );
		deepEqual( result.includes( '[en→es]This is translated' ), true );
	} );
} );
