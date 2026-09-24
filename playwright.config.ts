import { defineConfig } from '@playwright/test';

export default defineConfig({
	webServer: {
		command: 'pnpm build && pnpm preview',
		port: 4173,
		reuseExistingServer: !process.env.CI
	},
	use: {
		channel: process.env.CI ? undefined : 'msedge'
	},
	testMatch: '**/*.e2e.{ts,js}'
});
