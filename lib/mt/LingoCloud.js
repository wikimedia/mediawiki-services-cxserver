'use strict';

const preq = require( 'preq' ),
	MTClient = require( './MTClient.js' ),
	lingocloudLanguageNameMap = {
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
	translateText( sourceLang, targetLang, sourceText ) {
		const key = this.conf.mt.LingoCloud.key;
		if ( key === null ) {
			return Promise.reject( new Error( 'LingoCloud service is misconfigured' ) );
		}

		const length = sourceText.length;
		const limit = 10000;
		if ( length > limit ) {
			return Promise.reject( new Error( `Source text too long: ${length} (${limit} is the limit)` ) );
		}

		sourceLang = lingocloudLanguageNameMap[ sourceLang ] || sourceLang;
		targetLang = lingocloudLanguageNameMap[ targetLang ] || targetLang;

		const postData = {
			uri: this.conf.mt.LingoCloud.api + '/translator',
			headers: {
				'x-authorization': 'token ' + key,
				'content-type': 'application/json'
			},
			/* eslint-disable camelcase */
			body: {
				request_id: this.conf.mt.LingoCloud.account,
				replaced: true,
				trans_type: sourceLang + '2' + targetLang,
				source: sourceText,
				media: 'text'
			}
		};

		return preq.post( postData )
			.then( ( response ) => {
				const body = response.body;
				this.metrics.makeMetric( {
					type: 'Counter',
					name: 'translate.LingoCloud.charcount',
					prometheus: {
						name: 'translate_lingocloud_charcount',
						help: 'LingoCloud character count'
					}
				} ).increment( length );
				if ( 'target' in body ) {
					const target = response.body.target;
					if ( target instanceof Array ) {
						return target.join( '' );
					} else {
						return target;
					}
				} else {
					if ( response.status === 200 ) {
						throw new Error( 'Translation with LingoCloud failed. Error: ' +
							this.getErrorName( response.body.error ) +
							` for ${sourceLang} + '>' + ${targetLang}: ` );
					} else {
						throw new Error( 'Translation with LingoCloud failed. Error: ' +
							this.getErrorName( response.status ) +
							` for ${sourceLang} > ${targetLang}: ` );
					}
				}
			} );
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

		return `Unknown error: ${code}`;
	}

	requiresAuthorization() {
		return true;
	}
}

module.exports = LingoCloud;
