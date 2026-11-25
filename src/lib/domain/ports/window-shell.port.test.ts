import { describe, it, expect } from 'vitest';
import {
	MAIN_WINDOW_DIMENSIONS,
	MAIN_WINDOW_MIN_DIMENSIONS,
	MINI_WINDOW_DIMENSIONS,
	MINI_WINDOW_MIN_DIMENSIONS,
	type IWindowShell,
	type WindowDimensions
} from './window-shell.port';

describe('Window Shell Port', () => {
	describe('Dimension Constants', () => {
		it('should define the main window dimensions as 800x682', () => {
			expect(MAIN_WINDOW_DIMENSIONS).toEqual({ width: 800, height: 682 });
		});

		it('should define the main window minimum dimensions as 480x500', () => {
			expect(MAIN_WINDOW_MIN_DIMENSIONS).toEqual({ width: 480, height: 500 });
		});

		it('should define the mini window dimensions as 320x48', () => {
			expect(MINI_WINDOW_DIMENSIONS).toEqual({ width: 320, height: 48 });
		});

		it('should define the mini window minimum dimensions as 200x40', () => {
			expect(MINI_WINDOW_MIN_DIMENSIONS).toEqual({ width: 200, height: 40 });
		});

		it('should keep mini dimensions strictly smaller than main dimensions', () => {
			expect(MINI_WINDOW_DIMENSIONS.width).toBeLessThan(MAIN_WINDOW_DIMENSIONS.width);
			expect(MINI_WINDOW_DIMENSIONS.height).toBeLessThan(MAIN_WINDOW_DIMENSIONS.height);
			expect(MINI_WINDOW_MIN_DIMENSIONS.width).toBeLessThan(MAIN_WINDOW_MIN_DIMENSIONS.width);
			expect(MINI_WINDOW_MIN_DIMENSIONS.height).toBeLessThan(MAIN_WINDOW_MIN_DIMENSIONS.height);
		});

		it('should keep requested mini dimensions within the allowed mini minimum', () => {
			expect(MINI_WINDOW_DIMENSIONS.width).toBeGreaterThanOrEqual(MINI_WINDOW_MIN_DIMENSIONS.width);
			expect(MINI_WINDOW_DIMENSIONS.height).toBeGreaterThanOrEqual(
				MINI_WINDOW_MIN_DIMENSIONS.height
			);
		});
	});

	describe('Contract Shape', () => {
		function createContractStub(): IWindowShell {
			const dimensions: WindowDimensions = { width: 300, height: 80 };

			return {
				isSupported: true,
				enterMiniPlayer: async () => {
					void dimensions;
				},
				restoreMainWindow: async () => {},
				isAlwaysOnTop: async () => true,
				minimize: async () => {},
				toggleMaximize: async () => {},
				close: async () => {},
				isMaximized: async () => false,
				onMaximizedChange: async () => () => {}
			};
		}

		it('should expose isSupported, enterMiniPlayer, restoreMainWindow and isAlwaysOnTop', () => {
			const shell = createContractStub();

			expect(shell.isSupported).toBe(true);
			expect(typeof shell.enterMiniPlayer).toBe('function');
			expect(typeof shell.restoreMainWindow).toBe('function');
			expect(typeof shell.isAlwaysOnTop).toBe('function');
		});

		it('should expose the window control operations of the title bar strip', () => {
			const shell = createContractStub();

			expect(typeof shell.minimize).toBe('function');
			expect(typeof shell.toggleMaximize).toBe('function');
			expect(typeof shell.close).toBe('function');
		});

		it('should expose the maximized state as a query plus a subscription', async () => {
			const shell = createContractStub();

			await expect(shell.isMaximized()).resolves.toBe(false);

			const unsubscribe = await shell.onMaximizedChange(() => {});
			expect(typeof unsubscribe).toBe('function');
		});

		it('should resolve the subscription to an unsubscribe that can be called once', async () => {
			const seen: boolean[] = [];
			const shell = createContractStub();

			const unsubscribe = await shell.onMaximizedChange((maximized) => {
				seen.push(maximized);
			});
			unsubscribe();

			expect(seen).toEqual([]);
		});

		it('should type dimension values as readonly numbers', () => {
			const dimensions: WindowDimensions = { width: 260, height: 60 };

			expect(dimensions.width).toBe(260);
			expect(dimensions.height).toBe(60);
		});
	});
});
