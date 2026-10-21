import { readFileSync } from 'node:fs';

import { describe, expect, it } from 'vitest';

import { resolveE2EPort } from './browser-channel';

const CI_WORKFLOW = readFileSync(
	new URL('../../.github/workflows/ci.yml', import.meta.url),
	'utf8'
);

describe('CI workflow contract', () => {
	it('runs the browser and e2e suites that used to be local only', () => {
		expect(CI_WORKFLOW).toContain('run: pnpm test:browser');
		expect(CI_WORKFLOW).toContain('run: pnpm test:e2e');
	});

	it('builds the SPA before E2E, because the CI web server only previews', () => {
		expect(CI_WORKFLOW.indexOf('run: pnpm build')).toBeLessThan(
			CI_WORKFLOW.indexOf('run: pnpm test:e2e')
		);
	});

	it('installs the Playwright Chromium the runner launches', () => {
		expect(CI_WORKFLOW).toContain('playwright install --with-deps chromium');
	});
});

describe('E2E preview server', () => {
	it('never reuses a server it did not start', async () => {
		const { default: config } = await import('../../playwright.config');

		expect(config.webServer).toMatchObject({ reuseExistingServer: false });
	});

	it('passes the derived port to the preview server', async () => {
		const { default: config } = await import('../../playwright.config');
		const command = (config.webServer as { command: string }).command;

		expect(command).toContain(`--port ${resolveE2EPort()}`);
	});

	it('keeps derived ports below the OS ephemeral range', () => {
		expect(resolveE2EPort('C:/repo/pomody-worktrees/full-suite-ci', {})).toBeLessThan(32768);
	});
});
