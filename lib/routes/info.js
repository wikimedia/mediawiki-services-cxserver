'use strict';

const express = require( 'express' );
const router = express.Router();

/**
 * GET /
 * Gets some basic info about this service
 */
router.get( '/', ( req, res ) => {
	// simple sync return
	res.json( {
		name: req.app.info.name,
		version: req.app.info.version,
		description: req.app.info.description,
		home: req.app.info.homepage
	} );

} );

/**
 * GET /name
 * Gets the service's name as defined in package.json
 */
router.get( '/name', ( req, res ) => {
	// simple return
	res.json( {
		name: req.app.info.name
	} );

} );

/**
 * GET /version
 * Gets the service's version as defined in package.json
 */
router.get( '/version', ( req, res ) => {
	// simple return
	res.json( {
		version: req.app.info.version
	} );

} );

/**
 * ALL /home
 * Redirects to the service's home page if one is given,
 * returns a 404 otherwise
 */
router.all( '/home', ( req, res ) => {
	const home = req.app.info.homepage;

	if ( home && /^http/.test( home ) ) {
		// we have a home page URI defined, so send it
		res.redirect( 301, home );
		return;
	} else {
		// no URI defined for the home page, error out
		res.status( 404 ).end( 'No home page URL defined for ' + req.app.info.name );
	}

} );

module.exports = router;
