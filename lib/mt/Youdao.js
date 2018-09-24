'use strict';

const preq = require( 'preq' ),
	LinearDoc = require( './../lineardoc' ),
	MTClient = require( './MTClient.js' ),
	youdaoLanguageNameMap = {
		'en>zh': 'EN2ZH_CN', // English to Chinese Simplified
		'simple>zh': 'EN2ZH_CN', // English to Chinese Simplified
		'en>zh-cn': 'EN2ZH_CN', // English to Chinese Simplified
		'simple>zh-cn': 'EN2ZH_CN', // English to Chinese Simplified
		'ja>zh-cn': 'JA2ZH_CN', // Japanese to Chinese Simplified,
		'ja>zh': 'JA2ZH_CN', // Japanese to Chinese Simplified,
		'ko>zh-cn': 'KR2ZH_CN', // Korean to Chinese Simplified
		'fr>zh-cn': 'FR2ZH_CN', // Korean to Chinese Simplified
		'ru>zh-cn': 'RU2ZH_CN', // Russian to Chinese Simplified
		'es>zh-cn': 'SP2ZH_CN', // Spanish to Chinese Simplified
		'zh>en': 'ZH_CN2EN', // Chinese Simplified/Traditional to English
		'zh>simple': 'ZH_CN2EN', // Chinese Simplified/Traditional to Simple English
		'zh>ja': 'ZH_CN2JA', // Chinese Simplified/Traditional to Japanese
		'zh>ko': 'ZH_CN2KR', // Chinese Simplified/Traditional to Korean
		'zh>fr': 'ZH_CN2FR', // Chinese Simplified/Traditional to French
		'zh>ru': 'ZH_CN2RU', // Chinese Simplified/Traditional to Russian
		'zh>es': 'ZH_CN2SP' // Chinese Simplified/Traditional to Spanish
	};

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
			var newTextBlock;

			newTextBlock = item.item.translateTags(
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
		let targetDoc, chain = [];

		this.buildSourceDoc( sourceHtml );
		// Clone and adapt sourceDoc
		targetDoc = new LinearDoc.Doc( this.sourceDoc.wrapperTag );

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
		let postData, key = this.conf.mt.Youdao.key;
		if ( key === null ) {
			return Promise.reject( new Error( 'Youdao service is misconfigured' ) );
		}

		if ( sourceText.length > 10000 ) {
			return Promise.reject( new Error( 'Source text too long: ' +
			sourceLang + '-' + targetLang ) );
		}

		postData = {
			uri: this.conf.mt.Youdao.api,
			proxy: this.conf.proxy,
			body: {
				key: key,
				type: 'data',
				doctype: 'json',
				q: sourceText,
				l: youdaoLanguageNameMap[ sourceLang + '>' + targetLang ],
				transtype: 'translate'
			}
		};
		return preq.post( postData ).then( ( response ) => {
			if ( response.body.errorCode === 0 ) {
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
			10: 'Some sentence in source text is too long',
			11: 'No dictionay result',
			20: 'Source text too long',
			30: 'Server down',
			40: 'Unsupported language code',
			50: 'Invalid key',
			52: 'IP of the request is invalid',
			60: 'Reaching the spending limit for today',
			70: 'Insufficinent balance'
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
