'use strict';

const cxUtil = require( '../util.js' );
const MTClient = require( './MTClient.js' );
const { Agent } = require( 'undici' );

// MinT language codes can differ from the language codes that wiki use.
// Be agnostic of the domain code, language code differences, accept both,
// map to the language code that the MinT server knows.
const mintLanguageNameMap = {
	'be-tarask': 'be', // T343450
	bho: 'bh', // Bhojpuri. https://bh.wikipedia.org has contentlanguage as bho
	nan: 'zh-min-nan', // T354666
	nb: 'no', // Accept both nb and no, and map to 'no' in MinT
	simple: 'en', // Accept Simple English, map to English
	sh: 'bs', // T343450
	wuu: 'zh' // T343450
};

class MinT extends MTClient {
	/**
	 * @inheritdoc
	 */
	getDelimiter() {
		return '\n';
	}

	/**
	 * Translate the given content between the language pairs.
	 *
	 * @param {string} sourceLang Source language code
	 * @param {string} targetLang Target language code
	 * @param {string} content Content to translate
	 * @param {string} [format="html"] Format of the content- html or text
	 * @return {Promise} Deferred promise: Target language text
	 */
	async translate( sourceLang, targetLang, content, format = 'html' ) {

		if ( format === 'text' && !cxUtil.isPlainText( content ) ) {
			format = 'html';
		}

		sourceLang = mintLanguageNameMap[ sourceLang ] || sourceLang;
		targetLang = mintLanguageNameMap[ targetLang ] || targetLang;

		const payload = {
			// eslint-disable-next-line camelcase
			source_language: sourceLang,
			// eslint-disable-next-line camelcase
			target_language: targetLang,
			format: format,
			content
		};

		try {
			const response = await fetch( this.conf.mt.MinT.api, {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json'
				},
				body: JSON.stringify( payload ),
				dispatcher: new Agent( { connect: { timeout: 60_000 } } )
			} );

			if ( !response.ok ) {
				throw new Error( `${ response.status }` );
			}
			this.metrics.makeMetric( {
				type: 'Counter',
				name: 'translate.MinT.charcount',
				prometheus: {
					name: 'translate_mint_charcount',
					help: 'MinT character count'
				}
			} ).increment( content.length );

			const translationResponse = await response.json();
			return translationResponse.translation;
		} catch ( error ) {
			throw new Error( `Translation with MinT ${ sourceLang }>${ targetLang } failed: ${ error.message }` );
		}
	}

}

module.exports = MinT;
