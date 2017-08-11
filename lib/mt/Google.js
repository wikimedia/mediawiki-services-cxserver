'use strict';

var
    util = require('util'),
    preq = require('preq'),
    LinearDoc = require('./../lineardoc'),
    BBPromise = require('bluebird'),
    MTClient = require('./MTClient.js'),
    crypto = require('crypto'),
    Translate = require('@google-cloud/translate');

// Google language codes differ from the language codes that we use.
// See Google's language list on http://ai.Google.com/docs/api.s#id5

var GoogleLanguageNameMap = {
	'zh': 'zh-CN',
	'zh-cn': 'zh-CN',
	'ja': 'ja',
	'en': 'en',
	'simple': 'en',
	'ko': 'ko',
	'fr': 'fr',
	'ru': 'ru',
	'pt': 'pt',
	'es': 'es',
};

function Google(options) {
    this.logger = options.logger;
    this.conf = options.conf;
}

Google.prototype.md5 = function (text) {
    return crypto.createHash('md5').update(text).digest('hex');
};

util.inherits(Google, MTClient);

/**
 * Translate marked-up text
 * Google does not support HTML translation. So we need to pass the plain text
 * version. We are not piping this to translateText because we want to preseve
 * the textblocks. But we cannot do annotation mapping because of complexity of
 * segmentation for CJK languages.
 *
 * @param {string} sourceLang Source language code
 * @param {string} targetLang Target language code
 * @param {string} sourceHtml Source html
 * @return {Promise} promise: Translated html
 */
Google.prototype.translateHtml = function (sourceLang, targetLang, sourceHtml) {
    var i, len, targetDoc, chain = [],
        self = this;

    this.buildSourceDoc(sourceHtml);
    // Clone and adapt sourceDoc
    targetDoc = new LinearDoc.Doc(this.sourceDoc.wrapperTag);

    function translateItemDeferred(item) {
        if (item.type !== 'textblock') {
            return BBPromise.resolve(item);
        }

        return self.translateText(
            sourceLang,
            targetLang,
            item.item.getPlainText()
        ).then(function (translated) {
            var newTextBlock;

            newTextBlock = item.item.translateTags(
                translated, {} // Range mapping is empty. We dont do annotation mapping.
            );

            return {
                type: 'textblock',
                item: newTextBlock
            };
        });
    }

    for (i = 0, len = this.sourceDoc.items.length; i < len; i++) {
        chain.push(translateItemDeferred(this.sourceDoc.items[i]));
    }

    return BBPromise.all(chain).then(function (results) {
        targetDoc.items = results;
        return targetDoc.getHtml();
    });
};

// Google.prototype.translateText = function (sourceLang, targetLang, sourceText) {
// 	var self = this,
// 		key, postData;

// 	var appKey = this.conf.mt.Google.key;
// 	var appSecret = this.conf.mt.Google.secret;

// 	if ((appKey === null) || (appSecret === null)) {
// 		return BBPromise.reject(new Error('Google service is misconfigured'));
// 	}

// 	if (sourceText.length > 10000) {
// 		return BBPromise.reject(new Error('Source text too long: ' +
// 			sourceLang + '-' + targetLang));
// 	}

// 	postData = {
// 		uri: this.conf.mt.Google.api,
// 		proxy: this.conf.proxy,
// 		body: {
// 			appKey: appKey,
// 			type: 'data',
// 			doctype: 'json',
// 			q: sourceText,
// 			from: GoogleLanguageNameMap[sourceLang],
// 			to: GoogleLanguageNameMap[targetLang],
// 			salt: this.conf.mt.Google.salt,
// 			sign: self.md5(appKey + sourceText + this.conf.mt.Google.salt + appSecret)
// 		}
// 	};

// 	return preq.post(postData).then(function (response) {
// 		if (response.body.errorCode === '0') {
// 			return response.body.translation[0];
// 		} else {
// 			throw new Error('Translation with Google failed. Error: ' +
// 				self.getErrorName(response.body.errorCode) +
// 				' ' + sourceLang + '>' + targetLang);
// 		}
// 	});
// };
//
Google.prototype.translateText = function (sourceLang, targetLang, sourceText) {
    var self = this;
    // Your Google Cloud Platform project ID
    var projectId = 'gtxtranslator';

    // location that store json authorization file
    var keyFileLocaiton = this.conf.mt.google.keyfile ;

    if (sourceText.length > 10000) {
        return BBPromise.reject(new Error('Source text too long: ' +
            sourceLang + '-' + targetLang));
    }

    var translateClient = Translate({
        projectId: projectId,
        keyFilename: keyFileLocaiton
    });

    // Translates some text
    return translateClient.translate(sourceText, GoogleLanguageNameMap[targetLang]).then( function (data) {
        return data[0];
    });
};

/**
 * Returns error name from error code.
 *
 * @param {number} code Error code
 * @return {string}
 */
Google.prototype.getErrorName = function (code) {
    var errormap = {
        101: 'Missing required arguments',
        102: 'Unsupported language code',
        103: 'Source text too long',
        104: 'Unsupported API type',
        105: 'Unsupported sign type',
        106: 'Unsupported response type',
        107: 'Unsupported transport encryption type',
        108: 'Invaild appKey',
        109: 'Invaild batchLog format',
        110: 'No vaild instance associated to this service',
        111: 'Invaild developer account',
        201: 'Decrypt failed',
        202: 'Signature check failed',
        203: 'Not in accessible IP list.',
        301: 'Failed to query dictionary',
        302: 'Failed to check translation service',
        303: 'Server-side exception',
        401: 'Insufficinent balance'
    };

    if (code in errormap) {
        return errormap[code];
    }

    return 'Unknown error';
};

Google.prototype.requiresAuthorization = function () {
    return false;
};

module.exports = Google;