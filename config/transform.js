'use strict';

class TransformLanguages {
	constructor( conf ) {
		this.langs = conf.languages;
		this.pairs = conf.pairs;
		this.notAsTarget = conf.notAsTarget || [];
	}

	get languages() {
		const matrix = {};
		const englishVariants = [ 'en', 'simple' ];
		for ( let i = 0, len = this.langs.length; i < len; i++ ) {
			const lang = this.langs[ i ];
			matrix[ lang ] = this.langs.filter( ( l ) => {
				if ( englishVariants.includes( l ) && englishVariants.includes( lang ) ) {
					return false;
				}
				return l !== lang && !this.notAsTarget.includes( l );
			} );
		}

		for ( const sourceLang in this.pairs ) {
			matrix[ sourceLang ] = this.pairs[ sourceLang ].concat( matrix[ sourceLang ] || [] );
		}

		return matrix;
	}

}

module.exports = TransformLanguages;
