'use strict';

const axios = require( 'axios' );
const MTClient = require( './MTClient.js' );
const CXSegmenter = require( '../segmentation/CXSegmenter' );
const ProxyAgent = require( 'https-proxy-agent' );

class Flores extends MTClient {
	/**
	 * Split the content into sentences
	 *
	 * @param {string} sourceLang Source language code
	 * @param {string} sourceText Source language text
	 * @return {string[]} Array of sentences
	 */
	getSentences( sourceLang, sourceText ) {
		const segmenter = new CXSegmenter().getSegmenter( sourceLang );
		const sentencesBoundaryIndexes = segmenter( sourceText );
		const sentences = [];
		for ( let i = 0, len = sentencesBoundaryIndexes.length; i < len; i++ ) {
			sentences.push( sourceText.slice( i === 0 ? 0 : sentencesBoundaryIndexes[ i - 1 ], sentencesBoundaryIndexes[ i ] ) );
		}
		if ( !sentencesBoundaryIndexes.length ) {
			sentences.push( sourceText );
		}
		return sentences;
	}

	/**
	 * Translate plain text with Facebook Flores API
	 * Flores is not capable of HTML translation with all annotation
	 * mapping. For translating HTML, It uses CX's annotation mapping on top
	 * of the plaintext translation. Hence it inherits translateHTML method
	 * of MTClient.
	 *
	 * @param {string} sourceLang Source language code
	 * @param {string} targetLang Target language code
	 * @param {string} sourceText Source language text
	 * @return {Promise} promise: Target language text
	 */
	translateText( sourceLang, targetLang, sourceText ) {
		// SourceText example:
		//    This is sentence 1. This is a super sentence. This is a fantastic sentence..॥॥.Super.॥॥.Fantastic
		// After the below segmentation and split, following values are expected
		// Sentences:
		//    This is normal sentence.
		//    This is a super sentence.
		//    This is a fantastic sentence.
		// Annotations:
		//    Super
		//    Fantastic
		// Delimiter used by annotation mapping system
		const delimiter = '.॥॥.';
		// Flores is trained on sentences. So it works better if source content is split
		// at sentences. Do it using our sentence segmenter
		const sentencesStr = sourceText.split( delimiter )[ 0 ];
		const annotations = sourceText.split( delimiter ).slice( 1 );
		const sentences = this.getSentences( sourceLang, sentencesStr );
		const lines = [
			...sentences,
			...annotations
		];
		const samples = lines.map( ( line, index ) => ( {
			uid: index,
			sourceText: line,
			sourceLanguage: sourceLang,
			targetLanguage: targetLang
		} ) );

		const secret = this.conf.mt.Flores.secret;
		const headers = {
			'Content-Type': 'application/json'
		};

		const axiosRequest = {
			method: 'POST',
			url: this.conf.mt.Flores.api,
			data: { samples, secret },
			headers
		};

		if ( this.conf.proxy ) {
			// Axios proxy support is buggy(https://github.com/axios/axios/issues/2072)
			// Use a different proxy agent as workaround.
			const agent = ProxyAgent( this.conf.proxy );
			axiosRequest.proxy = false;
			axiosRequest.httpsAgent = agent;
		}

		return axios( axiosRequest ).then( ( response ) => {
			let translations;
			// The api returns JSON lines if there are multiple results.
			if ( typeof response.data === 'string' ) {
				translations = response.data.split( '\n' )
					.map( JSON.parse )
					.sort( ( a, b ) => a.id - b.id );
			} else {
				// Or returns a valid response
				translations = [ response.data ];
			}

			this.metrics.makeMetric( {
				type: 'Counter',
				name: 'translate.Flores.charcount',
				prometheus: {
					name: 'translate_flores_charcount',
					help: 'Flores character count'
				}
			} ).increment( sourceText.length );
			let translatedStr = '';
			for ( let i = 0; i < translations.length; i++ ) {
				if ( i >= sentences.length ) {
					translatedStr += delimiter;
				}
				translatedStr += translations[ i ].translatedText;
			}
			return translatedStr;
		} ).catch( ( error ) => {
			throw new Error( `Translation with Flores failed for ${sourceLang} > ${targetLang}. ` +
				`Error: ${error}` );
		} );
	}

	requiresAuthorization() {
		return true;
	}
}

module.exports = Flores;
