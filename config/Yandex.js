'use strict';

class TransformYandexLang {
	constructor( conf ) {
		this.langs = conf.languages;
		this.notAsTarget = conf.notAsTarget || [];
	}

	get languages() {
		let matrix = {};
		for ( let i = 0, len = this.langs.length; i < len; i++ ) {
			let lang = this.langs[ i ];
			matrix[ lang ] = this.langs.filter( l => { return l !== lang && !this.notAsTarget.includes( l ) } );
		}
		return matrix;
	}

}

module.exports = TransformYandexLang;
