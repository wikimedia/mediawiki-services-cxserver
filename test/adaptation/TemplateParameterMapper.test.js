'use strict';

const TemplateParameterMapper = require( '../../lib/adaptation/TemplateParameterMapper' );
const assert = require( '../utils/assert' );

const test = {
	sourceParams: {
		0: { wt: 'FirstValue' },
		srcName: { wt: 'NameValue' },
		firstname: { wt: 'FirstNameValue' },
		'namewithatailingspace ': { wt: 'SomeValue' },
		author: { wt: 'AuthorName' },
		'author-link1': { wt: 'author-link1-value' },
		datum: { wt: '25/12/2018' }
	},
	sourceTemplateData: {
		maps: {
			citoid: {
				date: 'Datum'
			}
		},
		params: {
			name: {
				aliases: [ 'srcName' ]
			},
			firstname: { aliases: [ 'first-name' ] },
			'namewithatailingspace ': {},
			author: { aliases: [ 'writer' ] },
			'author-link1': { aliases: [ 'authorlink' ] },
			datum: {},
			titel: {}
		}
	},
	targetTemplateData: {
		maps: {
			citoid: {
				edition: 'edition',
				publicationTitle: 'title'
			}
		},
		params: {
			título: {
				aliases: [ 'Name', 'nombre' ]
			},
			'primero-título': {
				aliases: [ 'First_Name', 'naciente' ]
			},
			// eslint-disable-next-line camelcase
			name_with_a_tailing_space: {},
			escritor: {
				aliases: [ 'Writer' ]
			},
			'escritor-link': {
				aliases: [ 'authorlink' ]
			},
			date: {}
		}
	},
	expectedParamMapping: {
		// Unnamed param name
		0: '0',
		// Mapped by aliases of source and target
		srcName: 'título',
		// Mapped by aliases of target
		firstname: 'primero-título',
		// Normalized source name, target name match
		'namewithatailingspace ': 'name_with_a_tailing_space',
		// Mapped by aliases of source and target
		author: 'escritor',
		// Mapped by aliases of source and target
		'author-link1': 'escritor-link',
		datum: 'date'
	}
};
describe( 'Template parameter mapping test', () => {
	const mapper = new TemplateParameterMapper(
		test.sourceParams, test.sourceTemplateData, test.targetTemplateData
	);
	it( 'should not have any errors while mapping params', () => {
		assert.deepEqual( mapper.getParameterMap(), ( test.expectedParamMapping ) );
	} );
} );
