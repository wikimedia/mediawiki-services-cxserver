'use strict';

let app;
const sUtil = require( '../util' );

const router = sUtil.router();

/**
 * GET /robots.txt
 * Instructs robots no indexing should occur on this domain.
 */
router.get( '/robots.txt', ( req, res ) => {
	res.set( 'Content-Type', 'text/plain' );
	res.send( 'User-agent: *\nDisallow: /' );
} );

/**
 * GET /
 * Main entry point. If no params given redirect to v2
 */
router.get( '/', ( req, res ) => {
	if ( !Object.prototype.hasOwnProperty.call( req.query || {}, 'spec' ) ) {
		res.redirect( 'v2' );
	} else {
		res.json( app.conf.spec );
	}

} );

module.exports = function ( appObj ) {
	app = appObj;
	return {
		path: '/',
		// eslint-disable-next-line camelcase
		skip_domain: true,
		router: router
	};

};
