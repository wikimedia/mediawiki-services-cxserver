'use strict';

const app = require( './app.js' );
const { getConfig } = require( './lib/util.js' );

app( getConfig() );
