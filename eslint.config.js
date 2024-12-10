import path from 'node:path';
import { fileURLToPath } from 'node:url';
import js from '@eslint/js';
import { FlatCompat } from '@eslint/eslintrc';
import globals from 'globals';
import babelParser from '@babel/eslint-parser';
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
	'wikimedia/jsduck',
	'plugin:import/recommended'
), {
	files: [ '**/*.js' ],
	ignores: [ '**/*.json' ],
	languageOptions: {
		parser: babelParser,
		parserOptions: {
			ecmaVersion: 2022,
			sourceType: 'module',
			requireConfigFile: false,
			deprecatedImportAssert: true,
			babelOptions: {
				babelrc: false,
				configFile: false,
				presets: [
					'@babel/preset-env'
				],
				plugins: [
					[
						'@babel/plugin-syntax-import-attributes',
						// TODO remove when we move to Node 22 and update import assert to import with
						{ deprecatedAssertSyntax: true }
					]
				]
			}
		},
		globals: {
			...globals.browser,
			...globals.node,
			assert: 'readonly'
		}
	},

	rules: {
		'no-unused-vars': 'error',
		'max-len': 'off',
		'n/no-process-exit': 'warn',
		'no-mixed-spaces-and-tabs': 'warn',
		'implicit-arrow-linebreak': 'warn',
		'n/no-unsupported-features/node-builtins': 'warn',
		'import/order': 'warn',
		'import/namespace': [ 'error', { allowComputed: true } ]
	}
}, {
	files: [ 'scripts/template-mapping.js', 'test/utils/server.js' ],

	rules: {
		camelcase: 'off',
		'n/no-process-exit': 'off'
	}
} ];
