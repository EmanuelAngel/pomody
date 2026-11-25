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

	it('initializes unmaximized with zero window-control counters', () => {
		const shell = new FakeWindowShell();

		expect(shell.maximized).toBe(false);
		expect(shell.minimizeCallCount).toBe(0);
		expect(shell.toggleMaximizeCallCount).toBe(0);
		expect(shell.closeCallCount).toBe(0);
		expect(shell.isMaximizedCallCount).toBe(0);
		expect(shell.onMaximizedChangeCallCount).toBe(0);
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
		await shell.minimize();
		await shell.toggleMaximize();
		await shell.close();
		await shell.onMaximizedChange(() => {});

		shell.reset();

		expect(shell.isMini).toBe(false);
		expect(shell.alwaysOnTop).toBe(false);
		expect(shell.enterMiniPlayerCallCount).toBe(0);
		expect(shell.restoreMainWindowCallCount).toBe(0);
		expect(shell.isAlwaysOnTopCallCount).toBe(0);
		expect(shell.lastDimensions).toBeUndefined();
		expect(shell.maximized).toBe(false);
		expect(shell.minimizeCallCount).toBe(0);
		expect(shell.toggleMaximizeCallCount).toBe(0);
		expect(shell.closeCallCount).toBe(0);
		expect(shell.onMaximizedChangeCallCount).toBe(0);
	});

	describe('window controls', () => {
		it('records minimize calls', async () => {
			const shell = new FakeWindowShell();

			await shell.minimize();

			expect(shell.minimizeCallCount).toBe(1);
		});

		it('records close calls', async () => {
			const shell = new FakeWindowShell();

			await shell.close();

			expect(shell.closeCallCount).toBe(1);
		});

		it('flips the simulated maximized state on toggleMaximize', async () => {
			const shell = new FakeWindowShell();

			await shell.toggleMaximize();
			expect(shell.maximized).toBe(true);

			await shell.toggleMaximize();
			expect(shell.maximized).toBe(false);
			expect(shell.toggleMaximizeCallCount).toBe(2);
		});

		it('reports the simulated maximized state from isMaximized', async () => {
			const shell = new FakeWindowShell();

			await expect(shell.isMaximized()).resolves.toBe(false);

			await shell.toggleMaximize();

			await expect(shell.isMaximized()).resolves.toBe(true);
			expect(shell.isMaximizedCallCount).toBe(2);
		});

		it('notifies subscribers when toggleMaximize changes the state', async () => {
			const shell = new FakeWindowShell();
			const seen: boolean[] = [];

			await shell.onMaximizedChange((maximized) => seen.push(maximized));
			await shell.toggleMaximize();

			expect(seen).toEqual([true]);
			expect(shell.onMaximizedChangeCallCount).toBe(1);
		});

		it('notifies subscribers of an OS-driven change through emitMaximizedChange', async () => {
			// `Win+Up` maximizes without going through the app, so the fake has to be
			// able to play that part for the observers under test.
			const shell = new FakeWindowShell();
			const seen: boolean[] = [];

			await shell.onMaximizedChange((maximized) => seen.push(maximized));
			shell.emitMaximizedChange(true);

			expect(seen).toEqual([true]);
			expect(shell.maximized).toBe(true);
		});

		it('stops notifying after the unsubscribe runs', async () => {
			const shell = new FakeWindowShell();
			const seen: boolean[] = [];

			const unsubscribe = await shell.onMaximizedChange((maximized) => seen.push(maximized));
			unsubscribe();
			await shell.toggleMaximize();

			expect(seen).toEqual([]);
		});

		it('supports more than one subscriber at a time', async () => {
			const shell = new FakeWindowShell();
			const first: boolean[] = [];
			const second: boolean[] = [];

			await shell.onMaximizedChange((maximized) => first.push(maximized));
			await shell.onMaximizedChange((maximized) => second.push(maximized));
			await shell.toggleMaximize();

			expect(first).toEqual([true]);
			expect(second).toEqual([true]);
		});
	});

	it('conforms strictly to the IWindowShell interface', () => {
		const shell: IWindowShell = new FakeWindowShell();

		expect(shell.isSupported).toBe(true);
	});
});
