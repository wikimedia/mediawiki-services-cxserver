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

export default UnsupportedTransclusion;
