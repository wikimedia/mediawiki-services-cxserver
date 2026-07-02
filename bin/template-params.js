// Extract template parameters from given template in a language wiki.
import { getConfig } from '../lib/util.js';
import { initApp } from '../app.js';
import MWApiRequestManager from '../lib/mw/MWApiRequestManager.js';

const cxConfig = getConfig( './config.yaml' );

const sourceLang = process.argv[ 2 ];
const templateTitle = process.argv[ 3 ];

const app = await initApp( cxConfig );
const api = new MWApiRequestManager( app );
const sourceTemplateData = await api.templateDataRequest(
	templateTitle,
	sourceLang
);
console.dir( sourceTemplateData );
