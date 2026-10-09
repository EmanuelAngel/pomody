import { describe, it, expect } from 'vitest';
import { MINI_WINDOW_DIMENSIONS } from '$lib/domain/ports/window-shell.port';
import { WebWindowShell } from './web-window-shell';

describe('WebWindowShell', () => {
	it('should never report native window support', () => {
		expect(new WebWindowShell().isSupported).toBe(false);
	});

	it('should resolve enterMiniPlayer without throwing', async () => {
		const shell = new WebWindowShell();

		await expect(shell.enterMiniPlayer()).resolves.toBeUndefined();
		await expect(shell.enterMiniPlayer(MINI_WINDOW_DIMENSIONS)).resolves.toBeUndefined();
	});

	it('should resolve restoreMainWindow without throwing', async () => {
		const shell = new WebWindowShell();

		await expect(shell.restoreMainWindow()).resolves.toBeUndefined();
	});

	it('should always resolve isAlwaysOnTop to false', async () => {
		const shell = new WebWindowShell();

		await expect(shell.isAlwaysOnTop()).resolves.toBe(false);
	});

	it('should run in a Node environment without DOM globals', async () => {
		expect(typeof window).toBe('undefined');
		expect(typeof document).toBe('undefined');

		const shell = new WebWindowShell();

		await expect(shell.enterMiniPlayer()).resolves.toBeUndefined();
		expect(shell.isSupported).toBe(false);
	});
});
