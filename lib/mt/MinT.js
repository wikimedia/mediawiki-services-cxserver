'use strict';

const preq = require( 'preq' );
const cxUtil = require( '../util.js' );
const MTClient = require( './MTClient.js' );

// MinT language codes can differ from the language codes that wiki use.
// Be agnostic of the domain code, language code differences, accept both,
// map to the language code that the MinT server knows.
const mintLanguageNameMap = {
	'be-tarask': 'be', // T343450
	bho: 'bh', // Bhojpuri. https://bh.wikipedia.org has contentlanguage as bho
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
	 * @return {Object} Deferred promise: Target language text
	 */
	translate( sourceLang, targetLang, content, format ) {
		let payload;

		if ( format === 'text' || cxUtil.isPlainText( content ) ) {
			payload = JSON.stringify( { text: content } );
		} else {
			payload = JSON.stringify( { html: content } );
		}

		sourceLang = mintLanguageNameMap[ sourceLang ] || sourceLang;
		targetLang = mintLanguageNameMap[ targetLang ] || targetLang;

		const postData = {
			uri: `${this.conf.mt.MinT.api}/${sourceLang}/${targetLang}`,
			headers: {
				'Content-Type': 'application/json'
			},
			body: payload
		};

		return preq.post( postData )
			.then( ( response ) => {
				this.metrics.makeMetric( {
					type: 'Counter',
					name: 'translate.MinT.charcount',
					prometheus: {
						name: 'translate_mint_charcount',
						help: 'MinT character count'
					}
				} ).increment( content.length );
				return response.body.translation;
			} )
			.catch( function ( e ) {
				throw new Error( `Translation with MinT ${sourceLang}>${targetLang} failed: ` + e );
			} );
	}

}

module.exports = MinT;
