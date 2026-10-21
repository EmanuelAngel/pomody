import { describe, expect, it } from 'vitest';

import {
	BUNDLED_CHROMIUM,
	DEFAULT_E2E_PORT,
	E2E_PORT_SPAN,
	resolveBrowserChannel,
	resolveE2EPort
} from './browser-channel';

describe('resolveBrowserChannel', () => {
	it('falls back to Edge outside CI so a Windows machine without Chromium still runs the browser suite', () => {
		expect(resolveBrowserChannel({})).toBe('msedge');
	});

	it('uses the Playwright-managed Chromium in CI, where Edge does not exist', () => {
		expect(resolveBrowserChannel({ CI: 'true' })).toBeUndefined();
	});

	it('honours an explicit channel over the environment default', () => {
		expect(resolveBrowserChannel({ CI: 'true', PLAYWRIGHT_CHANNEL: 'msedge' })).toBe('msedge');
	});

	it('treats the bundled keyword as the Playwright-managed Chromium even locally', () => {
		expect(resolveBrowserChannel({ PLAYWRIGHT_CHANNEL: BUNDLED_CHROMIUM })).toBeUndefined();
	});

	it('ignores a blank override so an empty variable cannot disable the browser', () => {
		expect(resolveBrowserChannel({ CI: 'true', PLAYWRIGHT_CHANNEL: '   ' })).toBeUndefined();
	});

	it('treats CI=false as local instead of as a truthy variable', () => {
		expect(resolveBrowserChannel({ CI: 'false' })).toBe('msedge');
	});
});

describe('resolveE2EPort', () => {
	it('gives every worktree its own stable port', () => {
		const main = resolveE2EPort('C:/repo/pomody', {});
		const sibling = resolveE2EPort('C:/repo/pomody-worktrees/full-suite-ci', {});

		expect(resolveE2EPort('C:/repo/pomody', {})).toBe(main);
		expect(sibling).not.toBe(main);
	});

	it('reserves the port range above the vite preview default', () => {
		const port = resolveE2EPort('C:/repo/pomody', {});

		expect(port).toBeGreaterThanOrEqual(DEFAULT_E2E_PORT);
		expect(port).toBeLessThan(DEFAULT_E2E_PORT + E2E_PORT_SPAN);
	});

	it('lets POMODY_E2E_PORT pin the port', () => {
		expect(resolveE2EPort('C:/repo/pomody', { POMODY_E2E_PORT: '5000' })).toBe(5000);
	});

	it('rejects an invalid POMODY_E2E_PORT instead of silently falling back', () => {
		expect(() => resolveE2EPort('C:/repo/pomody', { POMODY_E2E_PORT: 'e2e' })).toThrow(
			/POMODY_E2E_PORT/
		);
	});

	it('rejects a pinned port outside the valid TCP range', () => {
		expect(() => resolveE2EPort('C:/repo/pomody', { POMODY_E2E_PORT: '70000' })).toThrow(
			/POMODY_E2E_PORT/
		);
	});

	it('rejects port zero instead of asking vite for a random one', () => {
		expect(() => resolveE2EPort('C:/repo/pomody', { POMODY_E2E_PORT: '0' })).toThrow(
			/POMODY_E2E_PORT/
		);
	});

	it('trims a pinned port pasted with surrounding whitespace', () => {
		expect(resolveE2EPort('C:/repo/pomody', { POMODY_E2E_PORT: ' 5055 ' })).toBe(5055);
	});
});
