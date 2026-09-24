import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { ThemeState, createThemeState, themeState, THEMES } from './theme.svelte';

describe('ThemeState', () => {
	describe('Constants & Initial State', () => {
		it('should export all supported themes in THEMES constant', () => {
			expect(THEMES).toEqual(['dark', 'dawn', 'oled']);
		});

		it('should default to dark theme on initialization', () => {
			const theme = createThemeState();
			expect(theme.current).toBe('dark');
		});

		it('should accept custom initial theme', () => {
			const theme = createThemeState('dawn');
			expect(theme.current).toBe('dawn');
		});

		it('should export a singleton themeState defaulting to dark', () => {
			expect(themeState).toBeInstanceOf(ThemeState);
			expect(themeState.current).toBe('dark');
		});
	});

	describe('Switching Themes', () => {
		it('should update current theme when setTheme is called', () => {
			const theme = createThemeState();
			expect(theme.current).toBe('dark');

			theme.setTheme('dawn');
			expect(theme.current).toBe('dawn');

			theme.setTheme('oled');
			expect(theme.current).toBe('oled');

			theme.setTheme('dark');
			expect(theme.current).toBe('dark');
		});
	});

	describe('DOM Synchronization', () => {
		let mockDocument: {
			documentElement: {
				dataset: Record<string, string | undefined>;
			};
		};

		beforeEach(() => {
			mockDocument = {
				documentElement: {
					dataset: {}
				}
			};
			vi.stubGlobal('document', mockDocument);
		});

		afterEach(() => {
			vi.unstubAllGlobals();
		});

		it('should synchronize document.documentElement.dataset.theme when switching themes', () => {
			const theme = createThemeState();

			theme.setTheme('dawn');
			expect(mockDocument.documentElement.dataset.theme).toBe('dawn');

			theme.setTheme('oled');
			expect(mockDocument.documentElement.dataset.theme).toBe('oled');

			theme.setTheme('dark');
			expect(mockDocument.documentElement.dataset.theme).toBe('dark');
		});
	});

	describe('Non-browser / SSR Safety', () => {
		it('should safely update state without throwing when document is undefined', () => {
			// In node environment without document stubbed, typeof document is undefined
			expect(typeof document).toBe('undefined');

			const theme = createThemeState();
			expect(() => theme.setTheme('oled')).not.toThrow();
			expect(theme.current).toBe('oled');
		});
	});
});
