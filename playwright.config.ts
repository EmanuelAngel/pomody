import { defineConfig } from '@playwright/test';

import { resolveBrowserChannel, resolveE2EPort } from './src/testing/browser-channel.ts';

const inCI = Boolean(process.env.CI);
const port = resolveE2EPort();

export default defineConfig({
	webServer: {
		// CI already produced `build/` in an earlier step; a local run builds its own
		// artifact so E2E can never validate a stale one.
		command: inCI ? `pnpm preview --port ${port}` : `pnpm build && pnpm preview --port ${port}`,
		port,
		// Never adopt a server another worktree or a previous run left listening.
		reuseExistingServer: false
	},
	use: {
		channel: resolveBrowserChannel()
	},
	testMatch: '**/*.e2e.{ts,js}'
});
