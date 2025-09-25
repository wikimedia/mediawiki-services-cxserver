import { Agent, request } from 'undici';
import MTClient from './MTClient.js';
import apertiumLangMapping from './Apertium.languagenames.json' with {
	type: 'json',
};

class Apertium extends MTClient {
	/**
	 * Translate plain text with Apertium API
	 * Apertium is not capable of HTML translation with all annotation
	 * mapping. For translating HTML, It uses CX's annotation mapping on top
	 * of the plaintext translation. Hence it inherits translateHTML method
	 * of MTClient.
	 *
	 * @param {string} sourceLang Source language code
	 * @param {string} targetLang Target language code
	 * @param {string} sourceText Source language text
	 * @return {Promise} promise: Target language text
	 */
	async translateText( sourceLang, targetLang, sourceText ) {
		const url = this.conf.mt.Apertium.api + '/translate';
		const headers = {
			'Content-Type': 'application/x-www-form-urlencoded'
		};
		const requestBody = {
			markUnknown: 0,
			langpair: `${ apertiumLangMapping[ sourceLang ] }|${ apertiumLangMapping[ targetLang ] }`,
			format: 'txt',
			q: sourceText
		};
		const options = {
			method: 'POST',
			headers: headers,
			body: new URLSearchParams( requestBody ).toString(),
			dispatcher: new Agent( { connect: { timeout: 60_000 } } )
		};

		try {
			const { statusCode, body } = await request( url, options );
			if ( statusCode !== 200 ) {
				const responseText = await body.text();
				throw new Error(
					`Network error: HTTP ${ statusCode }: ${ responseText }`
				);
			}
			const data = await body.json();
			this.metrics
				.makeMetric( {
					type: 'Counter',
					name: 'translate.Apertium.charcount',
					help: 'Apertium character count'
				} )
				.increment( sourceText.length );
			if ( data?.responseData?.translatedText !== null ) {
				return data.responseData.translatedText;
			} else {
				throw new Error(
					'Processing error. JSON missing responseData.translatedText: ' +
						JSON.stringify( data )
				);
			}
		} catch ( error ) {
			throw new Error(
				`Translation with Apertium for ${ sourceLang } > ${ targetLang } failed: ${ error.message }`
			);
		}
	}
}

export default Apertium;
