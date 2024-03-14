'use strict';

const MTClient = require( './MTClient.js' );
const { ProxyAgent } = require( 'undici' );
const { HTTPError } = require( '../util.js' );

const lingocloudLanguageNameMap = {
	simple: 'en',
	wuu: 'zh'
};

/**
 * Lingocloud Translation client
 * Spec: https://app.swaggerhub.com/apis/caiyun/lingo-cloud_api/1.0.1#/interpreter/post_translator
 * Doc: http://wiki.swarma.net/index.php/%E5%BD%A9%E4%BA%91%E5%B0%8F%E8%AF%91API/en
 */
class LingoCloud extends MTClient {

	/**
	 * Translate plain text content with LingoCloud.
	 * LingoCloud is not capable of translating html.
	 *
	 * @param {string} sourceLang Source language code
	 * @param {string} targetLang Target language code
	 * @param {string} sourceText Source language text
	 * @return {Promise} Target language text
	 */
	async translateText( sourceLang, targetLang, sourceText ) {
		const key = this.conf.mt.LingoCloud.key;
		if ( key === null ) {
			return Promise.reject( new Error( 'LingoCloud service is misconfigured' ) );
		}

		const length = sourceText.length;
		const limit = 10000;
		if ( length > limit ) {
			return Promise.reject(
				new HTTPError( {
					status: 413,
					type: 'mt_error',
					detail: `LingoCloud: Source text too long: ${ length } (${ limit } is the limit)`
				} ) );
		}

		sourceLang = lingocloudLanguageNameMap[ sourceLang ] || sourceLang;
		targetLang = lingocloudLanguageNameMap[ targetLang ] || targetLang;

		const url = this.conf.mt.LingoCloud.api + '/translator';
		const headers = {
			'x-authorization': `token ${ key }`,
			'content-type': 'application/json'
		};
		/* eslint-disable camelcase */
		const body = {
			request_id: this.conf.mt.LingoCloud.account,
			replaced: true,
			trans_type: sourceLang + '2' + targetLang,
			source: sourceText,
			media: 'text'
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
					'Translation with LingoCloud failed. Error: ' +
					this.getErrorName( response.status ) +
					` for ${ sourceLang } > ${ targetLang }: `
				);
			}
			const data = await response.json();
			this.metrics.makeMetric( {
				type: 'Counter',
				name: 'translate.LingoCloud.charcount',
				prometheus: {
					name: 'translate_lingocloud_charcount',
					help: 'LingoCloud character count'
				}
			} ).increment( length );
			if ( 'target' in data ) {
				const target = data.target;
				if ( target instanceof Array ) {
					return target.join( '' );
				} else {
					return target;
				}
			}

		} catch ( error ) {
			throw new Error( `Translation with LingoCloud ${ sourceLang } > ${ targetLang } failed: ${ error.message }` );
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
			400: 'bad request',
			401: 'invalid token',
			402: 'blocked access token',
			403: 'api rate limit exceeded',
			415: 'wrong media type',
			500: 'internal server error',
			501: 'unsupported translation type'
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

module.exports = LingoCloud;
