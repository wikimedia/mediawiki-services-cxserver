'use strict';

class UnsupportedTransclusion {
	constructor( part ) {
		this.part = part;
	}

	adapt() {
		return {
			formatForParsoid: () => this.part,
			getMetadata: () => null
		};
	}
}

module.exports = UnsupportedTransclusion;
