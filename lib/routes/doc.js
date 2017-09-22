'use strict';

var app, sUtil = require( '../util' ),
	BBPromise = require( 'bluebird' ),
	fs = BBPromise.promisifyAll( require( 'fs' ) ),
	// Swagger-ui helpfully exports the absolute path of its dist directory
	docRoot = require( 'swagger-ui' ).dist + '/',
	router = sUtil.router();

function staticServe( req ) {
	// Expand any relative paths for security
	var filePath = req.query.path.replace( /\.\.\//g, '' );
	return fs.readFileAsync( docRoot + filePath, 'utf8' )
		.then( function ( body ) {
			var contentType;
			if ( filePath === '/index.html' ) {
				// Rewrite the HTML to use a query string
				body = body.replace( /((?:src|href)=['"])/g, '$1?doc=&path=' )
					// Some self-promotion
					.replace( /<a id="logo".*?<\/a>/,
						'<a id="logo" href="https://www.mediawiki.org/wiki/CX">' + app.conf.spec.info.title + '</a>' )
					.replace( /<title>[^<]*<\/title>/,
						'<title>' + app.conf.spec.info.title + ' docs</title>' )
					// Replace the default url with ours, switch off validation &
					// limit the size of documents to apply syntax highlighting to
					.replace( /Sorter: "alpha"/, 'Sorter: "alpha", validatorUrl: null, ' +
						'highlightSizeThreshold: 10000, docExpansion: "list"' )
					.replace( / url: url,/, 'url: "?spec",' );
			}

			contentType = 'text/html';
			if ( /\.js$/.test( filePath ) ) {
				contentType = 'text/javascript';
			} else if ( /\.png/.test( filePath ) ) {
				contentType = 'image/png';
			} else if ( /\.css/.test( filePath ) ) {
				contentType = 'text/css';
				body = body.replace( /\.\.\/(images|fonts)\//g, '?doc&path=$1/' );
			}
			return BBPromise.resolve( {
				status: 200,
				headers: {
					'content-type': contentType,
					'content-security-policy': 'default-src \'none\'; ' +
						'script-src \'self\' \'unsafe-inline\'; connect-src \'self\'; ' +
						'style-src \'self\' \'unsafe-inline\'; img-src \'self\'; font-src \'self\';'
				},
				body: body
			} );
		} );
}

router.get( '/', function ( req, res, next ) {
	var spec;
	if ( req.query.spec !== undefined && app.conf.spec ) {
		spec = Object.assign( {}, app.conf.spec, {
			// Set the base path dynamically
			basePath: req.path.toString().replace( /\/$/, '' )
		} );

		if ( req.params.domain === req.headers.host.replace( /:[0-9]+$/, '' ) ) {
			// This is a host-based request. Set an appropriate base path.
			spec.basePath = spec[ 'x-host-basePath' ] || spec.basePath;
		}

		res.send( spec );
	} else if ( req.query.doc !== undefined ||
		( /\btext\/html\b/.test( req.headers.accept ) && req.url.length <= 2 )
	) {
		// Return swagger UI & load spec from /?spec
		if ( !req.query.path ) {
			req.query.path = '/index.html';
		}
		return staticServe( req ).then(
			function ( data ) {
				res.set( data.headers );
				res.send( data.body );
			} );
	} else {
		next();
	}
} );

module.exports = function ( appObj ) {
	app = appObj;
	return {
		path: '/v1',
		// eslint-disable-next-line camelcase
		skip_domain: true,
		router: router
	};

};
