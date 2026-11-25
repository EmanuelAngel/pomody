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

	describe('window controls', () => {
		it('should resolve minimize as a no-op', async () => {
			// Browsers cannot minimize themselves; the call resolves and nothing happens.
			await expect(new WebWindowShell().minimize()).resolves.toBeUndefined();
		});

		it('should resolve toggleMaximize as a no-op', async () => {
			await expect(new WebWindowShell().toggleMaximize()).resolves.toBeUndefined();
		});

		it('should resolve close as a no-op without touching the DOM', async () => {
			// Degrading to `window.close()` would take the tab down and no browser
			// allows it for a tab the script did not open, so the adapter does nothing.
			await expect(new WebWindowShell().close()).resolves.toBeUndefined();
			expect(typeof window).toBe('undefined');
		});

		it('should always resolve isMaximized to false', async () => {
			await expect(new WebWindowShell().isMaximized()).resolves.toBe(false);
		});

		it('should return an unsubscribe that never fires on the web', async () => {
			const seen: boolean[] = [];
			const shell = new WebWindowShell();

			const unsubscribe = await shell.onMaximizedChange((maximized) => seen.push(maximized));
			expect(typeof unsubscribe).toBe('function');
			unsubscribe();

			expect(seen).toEqual([]);
		});
	});
});
