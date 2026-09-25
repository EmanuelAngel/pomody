import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { ThemeState, createThemeState, themeState, THEMES } from './theme.svelte';
import {
	DEFAULT_USER_SETTINGS,
	type ISettingsStorage,
	type UserSettings
} from '../domain/ports/settings-storage.port';

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

		it('should synchronize document.documentElement.dataset.theme on initialization', () => {
			createThemeState('dawn');
			expect(mockDocument.documentElement.dataset.theme).toBe('dawn');
		});

		it('should synchronize document.documentElement.dataset.theme on default initialization and when switching themes', () => {
			const theme = createThemeState();
			expect(mockDocument.documentElement.dataset.theme).toBe('dark');

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

	describe('ISettingsStorage persistence', () => {
		let mockStorage: ISettingsStorage;

		beforeEach(() => {
			mockStorage = {
				loadSettings: vi.fn((): UserSettings => ({
					...DEFAULT_USER_SETTINGS,
					theme: 'dawn'
				})),
				saveSettings: vi.fn(),
				resetSettings: vi.fn()
			};
		});

		it('should load saved theme from storage on initialization when initialTheme is omitted', () => {
			const theme = createThemeState(undefined, mockStorage);
			expect(theme.current).toBe('dawn');
			expect(mockStorage.loadSettings).toHaveBeenCalledTimes(1);
		});

		it('should give explicit initialTheme precedence over storage if both provided', () => {
			const theme = createThemeState('oled', mockStorage);
			expect(theme.current).toBe('oled');
		});

		it('should call storage.saveSettings with updated theme when setTheme is called', () => {
			const theme = createThemeState(undefined, mockStorage);
			expect(theme.current).toBe('dawn');

			theme.setTheme('oled');
			expect(theme.current).toBe('oled');
			expect(mockStorage.saveSettings).toHaveBeenCalledTimes(1);
			expect(mockStorage.saveSettings).toHaveBeenCalledWith({ theme: 'oled' });

			theme.setTheme('dark');
			expect(theme.current).toBe('dark');
			expect(mockStorage.saveSettings).toHaveBeenCalledTimes(2);
			expect(mockStorage.saveSettings).toHaveBeenLastCalledWith({ theme: 'dark' });
		});

		it('should safely operate without storage when not provided', () => {
			const theme = createThemeState();
			expect(theme.current).toBe('dark');
			expect(() => theme.setTheme('dawn')).not.toThrow();
			expect(theme.current).toBe('dawn');
		});
	});
});
