#!/usr/bin/env node
// Extract template parameters from given template in a language wiki.
import { logger } from '../lib/logging.js';
import { getConfig } from '../lib/util.js';
import { initApp } from '../app.js';
import MWApiRequestManager from '../lib/mw/MWApiRequestManager.js';
import PrometheusClient from '../lib/metric.js';

const cxConfig = getConfig();
cxConfig.logger = logger( cxConfig.name, cxConfig.logging );
cxConfig.metrics = new PrometheusClient( {
	staticLabels: { service: 'cxserver' }
} );

const sourceLang = process.argv[ 2 ];
const templateTitle = process.argv[ 3 ];

const app = await initApp( cxConfig );
const api = new MWApiRequestManager( app );
const sourceTemplateData = await api.templateDataRequest(
	templateTitle,
	sourceLang
);
console.dir( sourceTemplateData );
