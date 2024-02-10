'use strict';

const fs = require( 'fs' ).promises;
const path = require( 'path' );
const HTTPError = require( '../lib/util.js' ).HTTPError;

// Swagger-ui-dist helpfully exporting the absolute path of its dist directory
const docRoot = `${ require( 'swagger-ui-dist' ).getAbsoluteFSPath() }/`;
const DOC_CSP = "default-src 'none'; " +
	"script-src 'self' 'unsafe-inline'; connect-src *; " +
	"style-src 'self' 'unsafe-inline'; img-src 'self' data:; font-src 'self';";

function processRequest( app, req, res ) {
	const reqPath = req.query.path || '/index.html';
	const filePath = path.join( docRoot, reqPath );

	// Disallow relative paths.
	// Test relies on docRoot ending on a slash.
	if ( filePath.slice( 0, docRoot.length ) !== docRoot ) {
		throw new HTTPError( {
			status: 404,
			type: 'not_found',
			title: 'File not found',
			detail: `${ reqPath } could not be found.`
		} );
	}

	return fs.readFile( filePath )
		.then( ( body ) => {
			if ( reqPath === './swagger-initializer.js' ) {
				body = body.toString()
					.replace( /"https:\/\/petstore.swagger.io\/v2\/swagger.json"/g,
						'"/?spec"' );
			}
			if ( reqPath === '/index.html' ) {
				body = body.toString()
					.replace( /((?:src|href)=['"])/g, '$1?doc&path=' )
					.replace( /<title>[^<]*<\/title>/, `<title>${ app.info.name }</title>` );
			}

			let contentType = 'text/html';
			if ( /\.js$/.test( reqPath ) ) {
				contentType = 'text/javascript';
			} else if ( /\.png$/.test( reqPath ) ) {
				contentType = 'image/png';
			} else if ( /\.map$/.test( reqPath ) ) {
				contentType = 'application/json';
			} else if ( /\.ttf$/.test( reqPath ) ) {
				contentType = 'application/x-font-ttf';
			} else if ( /\.css$/.test( reqPath ) ) {
				contentType = 'text/css';
				body = body.toString()
					.replace( /\.\.\/(images|fonts)\//g, '?doc&path=$1/' )
					.replace( /sourceMappingURL=/, 'sourceMappingURL=/?doc&path=' );
			}

			res.setHeader( 'Content-Type', contentType );
			res.header( 'content-security-policy', DOC_CSP );
			res.header( 'x-content-security-policy', DOC_CSP );
			res.header( 'x-webkit-csp', DOC_CSP );
			res.send( body.toString() );
		} )
		.catch( { code: 'ENOENT' }, () => {
			res.status( 404 )
				.type( 'not_found' )
				.send( 'not found' );
		} );

}

module.exports = {
	processRequest
};
