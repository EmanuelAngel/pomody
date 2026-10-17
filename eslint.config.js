import prettier from 'eslint-config-prettier';
import path from 'node:path';
import js from '@eslint/js';
import svelte from 'eslint-plugin-svelte';
import { defineConfig, includeIgnoreFile } from 'eslint/config';
import globals from 'globals';
import ts from 'typescript-eslint';

const gitignorePath = path.resolve(import.meta.dirname, '.gitignore');

export default defineConfig(
	includeIgnoreFile(gitignorePath),
	js.configs.recommended,
	ts.configs.recommended,
	svelte.configs.recommended,
	prettier,
	svelte.configs.prettier,
	{
		languageOptions: { globals: { ...globals.browser, ...globals.node } },
		rules: {
			// typescript-eslint strongly recommend that you do not use the no-undef lint rule on TypeScript projects.
			// see: https://typescript-eslint.io/troubleshooting/faqs/eslint/#i-get-errors-from-the-no-undef-rule-about-global-variables-not-being-defined-even-though-there-are-no-typescript-errors
			'no-undef': 'off'
		}
	},
	{
		files: ['**/*.svelte', '**/*.svelte.ts', '**/*.svelte.js'],
		languageOptions: {
			parserOptions: {
				projectService: true,
				extraFileExtensions: ['.svelte'],
				parser: ts.parser
			}
		}
	},
	{
		// Override or add rule settings here, such as:
		// 'svelte/button-has-type': 'error'
		rules: {}
	},
	{
		// One Storage double for the whole repo. Adapters use InMemoryStorage as their SSR
		// fallback and tests use it as their double: a local copy drifts silently and the
		// copies already diverged once (six identical hand-rolled mocks across adapters).
		files: ['src/**/*.test.ts', 'src/**/*.spec.ts'],
		rules: {
			'no-restricted-syntax': [
				'error',
				{
					selector: 'FunctionDeclaration[id.name=/Storage$/]',
					message:
						'Hand-rolled Storage double: import InMemoryStorage from $lib/adapters/storage/in-memory-storage instead.'
				},
				{
					selector: 'ClassDeclaration[id.name=/Storage$/]',
					message:
						'Hand-rolled Storage double: import InMemoryStorage from $lib/adapters/storage/in-memory-storage instead.'
				},
				{
					selector: 'VariableDeclarator[id.name=/Storage$/] > ObjectExpression',
					message:
						'Hand-rolled Storage double: import InMemoryStorage from $lib/adapters/storage/in-memory-storage instead.'
				}
			]
		}
	},
	{
		files: ['src/lib/components/ui/**/*.svelte'],
		rules: {
			'svelte/no-navigation-without-resolve': 'off'
		}
	}
);
