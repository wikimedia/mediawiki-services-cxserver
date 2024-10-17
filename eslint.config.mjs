import path from 'node:path';
import { fileURLToPath } from 'node:url';
import js from '@eslint/js';
import { FlatCompat } from '@eslint/eslintrc';

const filename = fileURLToPath( import.meta.url );
const dirname = path.dirname( filename );
const compat = new FlatCompat( {
	baseDirectory: dirname,
	recommendedConfig: js.configs.recommended,
	allConfig: js.configs.all
} );

export default [ {
	ignores: []
}, ...compat.extends(
	'wikimedia/common',
	'wikimedia/node',
	'wikimedia/language/es2022',
	'wikimedia/jsduck'
), {
	languageOptions: {
		globals: {
			fetch: true
		}
	},

	rules: {
		'no-unused-vars': 'error',
		'max-len': 'off',
		'n/no-process-exit': 'warn',
		'no-mixed-spaces-and-tabs': 'warn',
		'implicit-arrow-linebreak': 'warn',
		'n/no-unsupported-features/node-builtins': 'warn'
	}
}, {
	files: [ 'scripts/template-mapping.js', 'test/utils/server.js' ],

	rules: {
		camelcase: 'off',
		'n/no-process-exit': 'off'
	}
} ];
