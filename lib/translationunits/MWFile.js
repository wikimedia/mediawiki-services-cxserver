'use strict';

const TranslationUnit = require( './TranslationUnit.js' ),
	CommonsFilePathPrefix = '//upload.wikimedia.org/wikipedia/commons/';
/**
 * This class is an adapter for <img>, <video> and <audio> nodes in the content.
 * It changes the `File` namespace prefix for resources to corresponding namespace
 * in target URL, if the resource is refering the file from Wikimedia commons.
 *
 * The node will get a new attribute data-cx with adapted key as true or false
 * depending on whether the namespace change happened or not.
 */
class MWFile extends TranslationUnit {

	/**
	 * Check if an file is coming from Commons or not. Uses the URL pattern of the common file
	 * repository to determine whether the file is stored there.
	 *
	 * @param {string} fileSrc
	 * @return {boolean}
	 */
	isCommonsResource( fileSrc ) {
		return fileSrc.includes( CommonsFilePathPrefix );
	}

	async adapt() {
		const dataCX = { adapted: true };
		const sourceResource = this.node.attributes.resource;
		let resourceURL = this.node.attributes.src || this.node.attributes.poster;
		if ( !resourceURL && this.node.children ) {
			const textChunks = this.node.children.textChunks;
			for ( let i = 0, len = textChunks.length; i < len; i++ ) {
				const chunk = textChunks[ i ];
				if ( chunk.inlineContent && chunk.inlineContent.name === 'source' ) {
					resourceURL = chunk.inlineContent.attributes.src;
				}
			}
		}

		if ( !resourceURL ) {
			return this.node;
		}

		if ( this.isCommonsResource( resourceURL ) ) {
			const namespaceAlias = await this.api.getNamespaceAlias( 'File', this.targetLanguage );
			const targetResource = sourceResource.replace( /^(\.\.?\/)*([^:]+)(:)/, '$1' + namespaceAlias + '$3' );
			this.node.attributes.resource = targetResource;
		} else {
			dataCX.adapted = false;
		}
		this.node.attributes[ 'data-cx' ] = JSON.stringify( dataCX );

		return this.node;
	}
}

MWFile.matchTagNames = [
	'video',
	'audio',
	'img'
];

module.exports = MWFile;
