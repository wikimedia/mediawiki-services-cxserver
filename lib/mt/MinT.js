'use strict';

const preq = require( 'preq' );
const MTClient = require( './MTClient.js' );
const CXSegmenter = require( '../segmentation/CXSegmenter' );

// MinT language codes can differ from the language codes that wiki use.
// Be agnostic of the domain code, language code differences, accept both,
// map to the language code that the MinT server knows.
const mintLanguageNameMap = {
	bho: 'bh', // Bhojpuri. https://bh.wikipedia.org has contentlanguage as bho
	simple: 'en', // Accept Simple English, map to English
	nb: 'no' // Accept both nb and no, and map to 'no' in MinT
};

class MinT extends MTClient {
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
	 * @inheritdoc
	 */
	getDelimiter() {
		return '\n';
	}

	/**
	 * Translate plain text with MinT API
	 * MinT is not capable of HTML translation with all annotation
	 * mapping. For translating HTML, It uses CX's annotation mapping on top
	 * of the plaintext translation. Hence it inherits translateHTML method
	 * of MTClient.
	 *
	 * Mint can do batch translations if the input has lines(\n seperated)
	 * That is also better for performance. Also, the underlying models like NLLB is trained
	 * on sentences and not paragraphs. So we also attempt to do a sentence segmentation.
	 *
	 * @param {string} sourceLang Source language code
	 * @param {string} targetLang Target language code
	 * @param {string} sourceText Source language text
	 * @return {Promise} promise: Target language text
	 */
	translateText( sourceLang, targetLang, sourceText ) {
		// SourceText example:
		//    This is normal sentence. This is a super sentence. This is a fantastic sentence.\nSuper\nFantastic
		// After the below segmentation and split, following values are expected
		// Sentences:
		//    This is normal sentence.
		//    This is a super sentence.
		//    This is a fantastic sentence.
		// Annotations:
		//    Super
		//    Fantastic
		const sentencesStr = sourceText.split( this.getDelimiter() )[ 0 ];
		const annotations = sourceText.split( this.getDelimiter() ).slice( 1 );
		const sentences = this.getSentences( sourceLang, sentencesStr );
		const lines = [
			...sentences,
			...annotations
		];

		sourceLang = mintLanguageNameMap[ sourceLang ] || sourceLang;
		targetLang = mintLanguageNameMap[ targetLang ] || targetLang;

		const postData = {
			uri: `${this.conf.mt.MinT.api}/${sourceLang}/${targetLang}`,
			headers: {
				'Content-Type': 'application/json'
			},
			body: JSON.stringify( {
				// Construct text by joining everything in lines array using new line character
				text: lines.join( this.getDelimiter() )
			} )
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
				} ).increment( sourceText.length );
				const responseStr = response.body.translation;
				const translations = responseStr.split( this.getDelimiter() );
				let translatedStr = '';
				for ( let i = 0; i < translations.length; i++ ) {
					if ( i >= sentences.length ) {
						translatedStr += this.getDelimiter();
					}
					translatedStr += translations[ i ];
				}

				return translatedStr;
			} )
			.catch( function ( e ) {
				throw new Error( `Translation with MinT ${sourceLang}>${targetLang} failed: ` + e );
			} );
	}
}

module.exports = MinT;
