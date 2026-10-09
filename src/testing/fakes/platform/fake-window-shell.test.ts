import { describe, it, expect } from 'vitest';
import { MINI_WINDOW_DIMENSIONS, type IWindowShell } from '$lib/domain/ports/window-shell.port';
import { FakeWindowShell } from './fake-window-shell';

describe('FakeWindowShell', () => {
	it('initializes in the main window with zero call counters', () => {
		const shell = new FakeWindowShell();

		expect(shell.isSupported).toBe(true);
		expect(shell.isMini).toBe(false);
		expect(shell.alwaysOnTop).toBe(false);
		expect(shell.enterMiniPlayerCallCount).toBe(0);
		expect(shell.restoreMainWindowCallCount).toBe(0);
		expect(shell.isAlwaysOnTopCallCount).toBe(0);
		expect(shell.lastDimensions).toBeUndefined();
	});

	it('flips to mini mode and records the requested dimensions on enterMiniPlayer', async () => {
		const shell = new FakeWindowShell();

		await shell.enterMiniPlayer();

		expect(shell.isMini).toBe(true);
		expect(shell.alwaysOnTop).toBe(true);
		expect(shell.enterMiniPlayerCallCount).toBe(1);
		expect(shell.lastDimensions).toEqual(MINI_WINDOW_DIMENSIONS);
	});

	it('records explicitly requested dimensions on enterMiniPlayer', async () => {
		const shell = new FakeWindowShell();

		await shell.enterMiniPlayer({ width: 300, height: 70 });

		expect(shell.lastDimensions).toEqual({ width: 300, height: 70 });
		expect(shell.enterMiniPlayerCallCount).toBe(1);
	});

	it('returns to main window mode on restoreMainWindow', async () => {
		const shell = new FakeWindowShell();

		await shell.enterMiniPlayer();
		await shell.restoreMainWindow();

		expect(shell.isMini).toBe(false);
		expect(shell.alwaysOnTop).toBe(false);
		expect(shell.restoreMainWindowCallCount).toBe(1);
	});

	it('counts repeated calls across transitions', async () => {
		const shell = new FakeWindowShell();

		await shell.enterMiniPlayer();
		await shell.enterMiniPlayer();
		await shell.restoreMainWindow();
		await shell.isAlwaysOnTop();

		expect(shell.enterMiniPlayerCallCount).toBe(2);
		expect(shell.restoreMainWindowCallCount).toBe(1);
		expect(shell.isAlwaysOnTopCallCount).toBe(1);
		expect(shell.isMini).toBe(false);
	});

	it('reports always-on-top state matching the simulated window', async () => {
		const shell = new FakeWindowShell();

		await expect(shell.isAlwaysOnTop()).resolves.toBe(false);

		await shell.enterMiniPlayer();

		await expect(shell.isAlwaysOnTop()).resolves.toBe(true);
	});

	it('allows overriding the supported flag for unsupported-platform scenarios', () => {
		const shell = new FakeWindowShell({ isSupported: false });

		expect(shell.isSupported).toBe(false);
	});

	it('resets all internal state and counters on reset()', async () => {
		const shell = new FakeWindowShell();

		await shell.enterMiniPlayer({ width: 320, height: 90 });
		await shell.restoreMainWindow();
		await shell.isAlwaysOnTop();

		shell.reset();

		expect(shell.isMini).toBe(false);
		expect(shell.alwaysOnTop).toBe(false);
		expect(shell.enterMiniPlayerCallCount).toBe(0);
		expect(shell.restoreMainWindowCallCount).toBe(0);
		expect(shell.isAlwaysOnTopCallCount).toBe(0);
		expect(shell.lastDimensions).toBeUndefined();
	});

	it('conforms strictly to the IWindowShell interface', () => {
		const shell: IWindowShell = new FakeWindowShell();

		expect(shell.isSupported).toBe(true);
	});
});
