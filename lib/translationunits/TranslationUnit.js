function TranslationUnit( node, context ) {
	this.node = node;
	this.context = context;
}

TranslationUnit.name = null;
TranslationUnit.matchTagNames = null;
TranslationUnit.matchRdfaTypes = null;

TranslationUnit.prototype.adapt = function() {
	return this.node;
};

module.exports = TranslationUnit;
