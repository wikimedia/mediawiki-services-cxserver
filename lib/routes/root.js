'use strict';

const express = require( 'express' );
const router = express.Router();

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
		res.json( req.app.conf.spec );
	}

} );

module.exports = router;
