'use strict';

const preq = require( 'preq' ),
	crypto = require( 'crypto' ),
	LinearDoc = require( './../lineardoc' ),
	MTClient = require( './MTClient.js' ),
	youdaoLanguageNameMap = {
		zh: 'zh_CHS',
		en: 'EN',
		simple: 'EN',
		wuu: 'zh_CHS'
	};

/**
 * Youdao MT client
 * API Documentation: https://ai.youdao.com/docs/doc-trans-api.s
 *
 * @class Youdao
 * @extends MTClient
 */
class Youdao extends MTClient {
	translateItemDeferred( item, sourceLang, targetLang ) {
		if ( item.type !== 'textblock' ) {
			return Promise.resolve( item );
		}

		return this.translateText(
			sourceLang,
			targetLang,
			item.item.getPlainText()
		).then( function ( translated ) {
			const newTextBlock = item.item.translateTags(
				translated, {} // Range mapping is empty. We dont do annotation mapping.
			);

			return {
				type: 'textblock',
				item: newTextBlock
			};
		} );
	}
	/**
	 * Translate marked-up text
	 * Youdao does not support HTML translation. So we need to pass the plain text
	 * version. We are not piping this to translateText because we want to preseve
	 * the textblocks. But we cannot do annotation mapping because of complexity of
	 * segmentation for CJK languages.
	 *
	 * @param {string} sourceLang Source language code
	 * @param {string} targetLang Target language code
	 * @param {string} sourceHtml Source html
	 * @return {Promise} promise: Translated html
	 */
	translateHtml( sourceLang, targetLang, sourceHtml ) {
		const chain = [];

		this.buildSourceDoc( sourceHtml );
		// Clone and adapt sourceDoc
		const targetDoc = new LinearDoc.Doc( this.sourceDoc.wrapperTag );

		for ( let i = 0, len = this.sourceDoc.items.length; i < len; i++ ) {
			chain.push(
				this.translateItemDeferred( this.sourceDoc.items[ i ], sourceLang, targetLang )
			);
		}

		return Promise.all( chain ).then( ( results ) => {
			targetDoc.items = results;
			return targetDoc.getHtml();
		} );
	}

	translateText( sourceLang, targetLang, sourceText ) {
		const appKey = this.conf.mt.Youdao.appKey;
		const appSecret = this.conf.mt.Youdao.appSecret;
		const salt = Math.floor( ( Math.random() * 100 ) );
		if ( appKey === null || appSecret === null ) {
			return Promise.reject( new Error( 'Youdao service is misconfigured' ) );
		}

		const length = sourceText.length;
		const limit = 10000;
		if ( length > limit ) {
			return Promise.reject( new Error( `Source text too long: ${length} (${limit} is the limit)` ) );
		}

		const postData = {
			uri: this.conf.mt.Youdao.api,
			proxy: this.conf.proxy,
			body: {
				q: sourceText,
				from: youdaoLanguageNameMap[ sourceLang ] || sourceLang,
				to: youdaoLanguageNameMap[ targetLang ] || targetLang,
				appKey: appKey,
				salt: salt,
				sign: crypto.createHash( 'md5' ).update( appKey + sourceText + salt + appSecret ).digest( 'hex' )
			}
		};

		return preq.post( postData ).then( ( response ) => {
			if ( parseInt( response.body.errorCode ) === 0 ) {
				this.metrics.makeMetric( {
					type: 'Counter',
					name: 'translate.Youdao.charcount',
					prometheus: {
						name: 'translate_youdao_charcount',
						help: 'Youdao character count'
					}
				} ).increment( length );
				return response.body.translation[ 0 ];
			} else {
				throw new Error( 'Translation with Youdao failed. Error: ' +
					this.getErrorName( response.body.errorCode || response.body ) +
						` for ${sourceLang} > ${targetLang}` );
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
			101: 'Lack of required parameters',
			102: 'Does not support the language',
			103: 'The translated text is too long',
			104: 'The type of API does not support',
			105: 'Do not support the type of signature',
			106: 'The types of response does not support',
			107: 'Does not support transmission encryption type',
			108: 'AppKey is invalid',
			109: 'Batchlog format is not correct',
			110: 'Without a valid instance of related services',
			111: 'The developer account is invalid, is proably accounts for the lack of state',
			201: 'Decryption failure, probably for DES, BASE64, URLDecode error',
			202: 'Signature verification failed',
			203: 'Access IP address is not accessible IP list',
			301: 'Dictionary query failure',
			302: 'Translate the query fails',
			303: 'Server-side other anomalies',
			401: 'Account has been overdue bills'
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
module.exports = Youdao;
