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
		it('should define the main window dimensions as 800x650', () => {
			expect(MAIN_WINDOW_DIMENSIONS).toEqual({ width: 800, height: 650 });
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
		it('should expose isSupported, enterMiniPlayer, restoreMainWindow and isAlwaysOnTop', () => {
			const dimensions: WindowDimensions = { width: 300, height: 80 };

			const shell: IWindowShell = {
				isSupported: true,
				enterMiniPlayer: async () => {
					void dimensions;
				},
				restoreMainWindow: async () => {},
				isAlwaysOnTop: async () => true
			};

			expect(shell.isSupported).toBe(true);
			expect(typeof shell.enterMiniPlayer).toBe('function');
			expect(typeof shell.restoreMainWindow).toBe('function');
			expect(typeof shell.isAlwaysOnTop).toBe('function');
		});

		it('should type dimension values as readonly numbers', () => {
			const dimensions: WindowDimensions = { width: 260, height: 60 };

			expect(dimensions.width).toBe(260);
			expect(dimensions.height).toBe(60);
		});
	});
});
