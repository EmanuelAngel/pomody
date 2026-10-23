import tailwindcss from '@tailwindcss/vite';
import { defineConfig } from 'vitest/config';
import { playwright } from '@vitest/browser-playwright';
import { sveltekit } from '@sveltejs/kit/vite';
import { paraglideVitePlugin } from '@inlang/paraglide-js';

import { fileURLToPath } from 'node:url';

import { resolveBrowserChannel } from './src/testing/browser-channel.ts';

export default defineConfig({
	resolve: {
		alias: {
			$tests: fileURLToPath(new URL('./src/testing', import.meta.url))
		}
	},
	plugins: [
		paraglideVitePlugin({
			project: './project.inlang',
			outdir: './src/lib/paraglide'
		}),
		tailwindcss(),
		sveltekit()
	],
	test: {
		expect: { requireAssertions: true },
		// Local runs share a 4-core machine with parallel worktrees; CI keeps the default.
		maxWorkers: process.env.CI ? undefined : 2,
		setupFiles: ['./src/testing/setup-locale.ts'],
		projects: [
			{
				extends: './vite.config.ts',
				test: {
					name: 'client',
					// A cold run re-optimizes newly imported modules and can report import
					// failures that are not regressions (docs/learnings/004). CI is always cold,
					// so a single bounded retry separates the false red from a real one.
					retry: process.env.CI ? 1 : 0,
					browser: {
						enabled: true,
						provider: playwright({
							launchOptions: { channel: resolveBrowserChannel() }
						}),
						instances: [{ browser: 'chromium', headless: true }]
					},
					include: ['src/**/*.svelte.{test,spec}.{js,ts}'],
					exclude: ['src/lib/server/**']
				}
			},

			{
				extends: './vite.config.ts',
				test: {
					name: 'server',
					environment: 'node',
					include: ['src/**/*.{test,spec}.{js,ts}'],
					exclude: ['src/**/*.svelte.{test,spec}.{js,ts}', 'src/lib/components/**']
				}
			}
		]
	}
});
