import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { getLocale } from '$lib/paraglide/runtime';
import { LocaleState, createLocaleState, localeState, t, SUPPORTED_LOCALES } from './locale.svelte';

describe('LocaleState', () => {
	let mockStorage: Record<string, string>;

	beforeEach(() => {
		mockStorage = {};
		vi.stubGlobal('localStorage', {
			getItem: vi.fn((key: string) => mockStorage[key] ?? null),
			setItem: vi.fn((key: string, value: string) => {
				mockStorage[key] = value;
			}),
			removeItem: vi.fn((key: string) => {
				delete mockStorage[key];
			}),
			clear: vi.fn(() => {
				mockStorage = {};
			})
		});
		localeState.setLocale('en');
	});

	afterEach(() => {
		localeState.setLocale('en');
		vi.unstubAllGlobals();
	});

	describe('Constants & Exports', () => {
		it('should export supported locales with en and es', () => {
			expect(SUPPORTED_LOCALES).toEqual(['en', 'es']);
		});

		it('should export a singleton localeState instance', () => {
			expect(localeState).toBeInstanceOf(LocaleState);
		});

		it('should export reactive proxy t and expose app_title', () => {
			expect(t).toBeDefined();
			expect(typeof t.app_title).toBe('function');
		});
	});

	describe('Storage Resolution & Defaults', () => {
		it('should default to en when localStorage is empty', () => {
			const state = createLocaleState();
			expect(state.current).toBe('en');
		});

		it('should restore es from localStorage (pomody_locale) when present', () => {
			mockStorage['pomody_locale'] = 'es';
			const state = createLocaleState();
			expect(state.current).toBe('es');
		});

		it('should fallback to en when localStorage contains invalid value (fr, xyz)', () => {
			mockStorage['pomody_locale'] = 'fr';
			expect(createLocaleState().current).toBe('en');

			mockStorage['pomody_locale'] = 'xyz';
			expect(createLocaleState().current).toBe('en');
		});

		it('should fallback to en when localStorage.getItem throws', () => {
			vi.stubGlobal('localStorage', {
				getItem: vi.fn(() => {
					throw new Error('Access denied');
				}),
				setItem: vi.fn(),
				removeItem: vi.fn(),
				clear: vi.fn()
			});
			const state = createLocaleState();
			expect(state.current).toBe('en');
		});

		it('should accept custom initial locale in createLocaleState', () => {
			const state = createLocaleState('es');
			expect(state.current).toBe('es');
		});
	});

	describe('Switching Locales', () => {
		it('should update current to es and persist to localStorage', () => {
			const state = createLocaleState('en');
			expect(state.current).toBe('en');

			state.setLocale('es');
			expect(state.current).toBe('es');
			expect(localStorage.getItem('pomody_locale')).toBe('es');
		});

		it('should switch back to en and update localStorage', () => {
			const state = createLocaleState('es');
			expect(state.current).toBe('es');

			state.setLocale('en');
			expect(state.current).toBe('en');
			expect(localStorage.getItem('pomody_locale')).toBe('en');
		});

		it('should treat redundant setLocale calls as no-ops', () => {
			const state = createLocaleState('en');
			const setItemSpy = vi.spyOn(localStorage, 'setItem');

			state.setLocale('en');
			expect(setItemSpy).not.toHaveBeenCalled();
		});

		it('should be resilient when localStorage.setItem throws (quota or security error)', () => {
			vi.stubGlobal('localStorage', {
				getItem: vi.fn(() => null),
				setItem: vi.fn(() => {
					throw new Error('QuotaExceededError');
				}),
				removeItem: vi.fn(),
				clear: vi.fn()
			});

			const state = createLocaleState('en');
			expect(() => state.setLocale('es')).not.toThrow();
			expect(state.current).toBe('es');
		});
	});

	describe('Paraglide Reactive Proxy t', () => {
		it('should return translated string according to active locale', () => {
			localeState.setLocale('en');
			expect(getLocale()).toBe('en');
			expect(t.app_title()).toBe('Pomody');
		});

		it('should resolve correctly when locale is changed to es', () => {
			localeState.setLocale('es');
			expect(getLocale()).toBe('es');
			expect(t.app_title()).toBe('Pomody');
		});
	});
});
