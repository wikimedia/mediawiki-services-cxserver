'use strict';

const MTClient = require( './MTClient.js' );
const { ProxyAgent } = require( 'undici' );
const { HTTPError } = require( '../util.js' );

/**
 * Elia machine translation service client.
 * API doc: https://mt-api.elhuyar.eus/
 * Source code: https://github.com/Elia
 * Note: Elia has multiple machine translation engines. "nmt" and "apertium"
 * Here we are using only "nmt" since we have Apertium MT service separately.
 * List of language pairs and MT engines can be obtained by using the API
 * https://mt-api.elhuyar.eus/language_pairs with API ID and Key params.
 */

const eliaLanguageNameMap = {
	simple: 'en'
};

class Elia extends MTClient {
	/**
	 * @inheritdoc
	 */
	translateLines( sourceLang, targetLang, sourceLines ) {
		// Join lines into single string. Separator must break sentences and pass through unchanged
		const sourceLinesText = sourceLines.join( '\n\n' );

		return this.translateText(
			sourceLang,
			targetLang,
			sourceLinesText
		).then( ( targetLinesText ) => targetLinesText.split( /\n\n/g ) );
	}

	/**
	 * Translate content with Elia API
	 * Elia supports HTML translation, but the precision of inline tags is
	 * not perfect to depend on it.
	 *
	 * @param {string} sourceLang Source language code
	 * @param {string} targetLang Target language code
	 * @param {string} sourceText Source language content
	 * @return {Promise} Target language content
	 */
	async translateText( sourceLang, targetLang, sourceText ) {
		const key = this.conf.mt.Elia.key;
		const apiId = this.conf.mt.Elia.apiId;
		if ( !key || !apiId ) {
			return Promise.reject( new Error( 'Elia service is misconfigured' ) );
		}
		// Elia does not set limit on input content as per documentation, but here we set a limit
		const length = sourceText.length;
		const limit = 10000;
		if ( length > limit ) {
			return Promise.reject(
				new HTTPError( {
					status: 413,
					type: 'mt_error',
					detail: `Elia: Source content too long: ${ length } (${ limit } is the limit)`
				} )
			);
		}

		sourceLang = eliaLanguageNameMap[ sourceLang ] || sourceLang;
		targetLang = eliaLanguageNameMap[ targetLang ] || targetLang;
		const url = this.conf.mt.Elia.api;
		const headers = {
			'Content-Type': 'application/json'
		};
		/* eslint-disable camelcase */
		const body = {
			api_id: apiId,
			api_key: key,
			translation_engine: 'nmt',
			content_type: 'txt',
			language_pair: `${ sourceLang }-${ targetLang }`,
			text: sourceText
		};
		const options = {
			method: 'POST',
			headers: headers,
			body: JSON.stringify( body )
		};

		if ( this.conf.proxy ) {
			options.dispatcher = new ProxyAgent( this.conf.proxy, {
				requestTls: {
					// Ignore proxy certificate errors, if any.
					rejectUnauthorized: false
				}
			} );
		}

		try {
			const response = await fetch( url, options );
			if ( !response.ok ) {
				throw new Error(
					'Translation with Elia failed. Error: ' +
					this.getErrorName( response.status ) +
					` for ${ sourceLang } > ${ targetLang }: `
				);
			}
			const data = await response.json();
			this.metrics.makeMetric( {
				type: 'Counter',
				name: 'translate.Elia.charcount',
				prometheus: {
					name: 'translate_Elia_charcount',
					help: 'Elia character count'
				}
			} ).increment( length );
			if ( 'translated_text' in data ) {
				return data.translated_text;
			} else {
				throw new Error(
					`Translation with Elia failed. Error: ${ this.getErrorName(
						data.code || data
					) } for ${ sourceLang } > ${ targetLang }`
				);
			}
		} catch ( error ) {
			throw new Error( `Translation with Elia ${ sourceLang } > ${ targetLang } failed: ${ error.message }` );
		}
	}

	/**
	 * Returns error name from error code.
	 *
	 * @param {number} code Error code
	 * @return {string}
	 */
	getErrorName( code ) {
		const errormap = {
			403: 'Invalid api key'
		};

		if ( code in errormap ) {
			return errormap[ code ];
		}

		return `Unknown error: ${ code }`;
	}

	requiresAuthorization() {
		return true;
	}
}

module.exports = Elia;
