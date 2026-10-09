import { describe, it, expect, beforeEach } from 'vitest';
import { MINI_WINDOW_DIMENSIONS, type IWindowShell } from '$lib/domain/ports/window-shell.port';
import { FakeWindowShell } from '$tests/fakes/platform/fake-window-shell';
import { WebWindowShell } from '$lib/adapters/window/web-window-shell';
import {
	WindowState,
	createWindowState,
	windowState,
	createDefaultWindowShell
} from './windowState.svelte';

describe('WindowState', () => {
	let shell: FakeWindowShell;
	let state: WindowState;

	beforeEach(() => {
		shell = new FakeWindowShell();
		state = createWindowState(shell);
	});

	describe('Initial State', () => {
		it('should start in main window mode with always-on-top disabled', () => {
			expect(state.isMiniPlayer).toBe(false);
			expect(state.isAlwaysOnTop).toBe(false);
		});

		it('should export a default singleton instance', () => {
			expect(windowState).toBeInstanceOf(WindowState);
			expect(windowState.isMiniPlayer).toBe(false);
		});
	});

	describe('toggleMiniPlayer', () => {
		it('should enter mini mode and pin the window on top', async () => {
			await state.toggleMiniPlayer();

			expect(state.isMiniPlayer).toBe(true);
			expect(state.isAlwaysOnTop).toBe(true);
			expect(shell.enterMiniPlayerCallCount).toBe(1);
			expect(shell.lastDimensions).toEqual(MINI_WINDOW_DIMENSIONS);
		});

		it('should restore the main window when toggled a second time', async () => {
			await state.toggleMiniPlayer();
			await state.toggleMiniPlayer();

			expect(state.isMiniPlayer).toBe(false);
			expect(state.isAlwaysOnTop).toBe(false);
			expect(shell.restoreMainWindowCallCount).toBe(1);
		});

		it('should flip the flags only after the shell call resolves', async () => {
			let releaseEnter: (() => void) | undefined;
			const gate = new Promise<void>((resolve) => {
				releaseEnter = resolve;
			});
			const gatedShell: IWindowShell = {
				isSupported: true,
				enterMiniPlayer: async () => {
					await gate;
				},
				restoreMainWindow: async () => {},
				isAlwaysOnTop: async () => false
			};
			const gatedState = createWindowState(gatedShell);

			const pending = gatedState.toggleMiniPlayer();
			expect(gatedState.isMiniPlayer).toBe(false);
			expect(gatedState.isAlwaysOnTop).toBe(false);

			releaseEnter?.();
			await pending;

			expect(gatedState.isMiniPlayer).toBe(true);
			expect(gatedState.isAlwaysOnTop).toBe(true);
		});
	});

	describe('restore', () => {
		it('should exit mini mode and unpin the window', async () => {
			await state.toggleMiniPlayer();
			await state.restore();

			expect(state.isMiniPlayer).toBe(false);
			expect(state.isAlwaysOnTop).toBe(false);
			expect(shell.restoreMainWindowCallCount).toBe(1);
		});

		it('should be idempotent when not in mini mode', async () => {
			await state.restore();
			await state.restore();

			expect(state.isMiniPlayer).toBe(false);
			expect(shell.restoreMainWindowCallCount).toBe(0);
		});
	});

	describe('Unsupported Platforms', () => {
		it('should no-op on toggleMiniPlayer when the shell is unsupported', async () => {
			const unsupportedShell = new FakeWindowShell({ isSupported: false });
			const unsupportedState = createWindowState(unsupportedShell);

			await unsupportedState.toggleMiniPlayer();

			expect(unsupportedState.isMiniPlayer).toBe(false);
			expect(unsupportedState.isAlwaysOnTop).toBe(false);
			expect(unsupportedShell.enterMiniPlayerCallCount).toBe(0);
			expect(unsupportedShell.restoreMainWindowCallCount).toBe(0);
		});

		it('should no-op on toggleMiniPlayer with the web shell', async () => {
			const webState = createWindowState(new WebWindowShell());

			await webState.toggleMiniPlayer();

			expect(webState.isMiniPlayer).toBe(false);
			expect(webState.isAlwaysOnTop).toBe(false);
		});
	});

	describe('Default Shell Selection', () => {
		it('should fall back to the web shell outside a Tauri runtime', () => {
			expect(createDefaultWindowShell()).toBeInstanceOf(WebWindowShell);
		});
	});
});
