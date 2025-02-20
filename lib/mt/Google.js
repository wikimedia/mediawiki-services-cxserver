import { ProxyAgent } from 'undici';
import { HTTPError } from '../util.js';
import MTClient from './MTClient.js';

// Google language codes can differ from the language codes that we use.
const googleLanguageNameMap = {
	arz: 'ar', // T317224
	'be-tarask': 'be', // T122033
	bcl: 'bik', // T369815
	bho: 'bh', // Bhojpuri
	dgo: 'doi', // T369815
	gan: 'zh-TW', // T258919
	he: 'iw', // Hebrew
	jv: 'jw', // Javanese
	knc: 'kr', // T369815
	mni: 'mni-Mtei', // Manipuri
	nb: 'no', // T132217
	nah: 'nhe', // T369815
	pnb: 'pa-Arab', // T369815
	rwr: 'mwr', // T369815
	simple: 'en', // Simple
	sh: 'bs', // T258919
	tw: 'ak', // Twi
	wuu: 'zh', // T258919
	zh: 'zh-CN' // Chinese
};

class Google extends MTClient {
	/**
	 * Translate marked-up text
	 *
	 * @param {string} sourceLang Source language code
	 * @param {string} targetLang Target language code
	 * @param {string} sourceHtml Source html
	 * @return {Promise} Promise that resolves translated html
	 */
	translate( sourceLang, targetLang, sourceHtml ) {
		return this.translateReducedHtml( sourceLang, targetLang, sourceHtml );
	}

	/**
	 * Translate html or plain text content with Google.
	 * Google is capable of translating plain text and html with
	 * annotations mapping (keeps markup retained in translated content).
	 * Hence overriding translate method of MTClient.
	 *
	 * @param {string} sourceLang Source language code
	 * @param {string} targetLang Target language code
	 * @param {string} sourceHtml Source language content
	 * @return {Promise} Target language content
	 */
	async translateHtml( sourceLang, targetLang, sourceHtml ) {
		const key = this.conf.mt.Google.key;
		if ( key === null ) {
			return Promise.reject( new Error( 'Google service is misconfigured' ) );
		}

		const length = sourceHtml.length;
		const limit = 10000;
		if ( length > limit ) {
			// Max limit is 10K characters for Google.
			return Promise.reject( new HTTPError( {
				status: 413,
				type: 'mt_error',
				detail: `Google: Source content too long: ${ length } (${ limit } is the character limit)`
			} ) );
		}

		sourceLang = googleLanguageNameMap[ sourceLang ] || sourceLang;
		targetLang = googleLanguageNameMap[ targetLang ] || targetLang;

		// See https://cloud.google.com/translate/v2/translating-text-with-rest
		const params = new URLSearchParams( {
			key: key,
			source: sourceLang,
			target: targetLang,
			format: 'html',
			q: sourceHtml
		} );

		const url = `${ this.conf.mt.Google.api }?${ params.toString() }`;
		const options = {};

		if ( this.conf.proxy ) {
			options.dispatcher = new ProxyAgent( this.conf.proxy, {
				// Ignore certificate errors from proxy server, if any.
				requestTls: {
					rejectUnauthorized: false
				}
			} );
		}

		try {
			const response = await fetch( url, options );
			if ( !response.ok ) {
				throw new Error(
					`Translation with Google failed. Error: ${ response.status } for ${ sourceLang } > ${ targetLang }`
				);
			}
			const translatedData = await response.json();
			this.metrics.makeMetric( {
				type: 'Counter',
				name: 'translate.Google.charcount',
				help: 'Google character count'
			} ).increment( length );

			return translatedData.data.translations[ 0 ].translatedText;
		} catch ( error ) {
			throw new Error( `Translation with Google ${ sourceLang } > ${ targetLang } failed: ${ error.message }` );
		}
	}

	requiresAuthorization() {
		return true;
	}

}

export default Google;
