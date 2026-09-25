import { describe, it, expect } from 'vitest';
import { DEFAULT_TIMER_CONFIG } from '../timer/timer-fsm';
import {
	DEFAULT_USER_SETTINGS,
	THEMES,
	type ISettingsStorage,
	type UserSettings
} from './settings-storage.port';

describe('Settings Storage Port & UserSettings Model', () => {
	describe('THEMES', () => {
		it('should include dark, dawn, and oled theme identifiers', () => {
			expect(THEMES).toEqual(['dark', 'dawn', 'oled']);
		});
	});

	describe('DEFAULT_USER_SETTINGS', () => {
		it('should match DEFAULT_TIMER_CONFIG, soundEnabled true, and dark theme', () => {
			expect(DEFAULT_USER_SETTINGS).toEqual({
				timer: DEFAULT_TIMER_CONFIG,
				soundEnabled: true,
				theme: 'dark'
			});
			expect(DEFAULT_USER_SETTINGS.timer).toBe(DEFAULT_TIMER_CONFIG);
			expect(DEFAULT_USER_SETTINGS.soundEnabled).toBe(true);
			expect(DEFAULT_USER_SETTINGS.theme).toBe('dark');
		});

		it('should be frozen to prevent unintended mutations', () => {
			expect(Object.isFrozen(DEFAULT_USER_SETTINGS)).toBe(true);
			expect(Object.isFrozen(DEFAULT_USER_SETTINGS.timer)).toBe(true);
		});
	});

	describe('ISettingsStorage contract compilation', () => {
		it('should allow valid implementation satisfying the port contract', () => {
			let stored: UserSettings = { ...DEFAULT_USER_SETTINGS };

			const mockStorage: ISettingsStorage = {
				loadSettings: () => stored,
				saveSettings: (patch: Partial<UserSettings>) => {
					stored = { ...stored, ...patch };
				},
				resetSettings: () => {
					stored = { ...DEFAULT_USER_SETTINGS };
				}
			};

			expect(mockStorage.loadSettings()).toEqual(DEFAULT_USER_SETTINGS);

			mockStorage.saveSettings({ theme: 'dawn', soundEnabled: false });
			expect(mockStorage.loadSettings().theme).toBe('dawn');
			expect(mockStorage.loadSettings().soundEnabled).toBe(false);

			mockStorage.resetSettings();
			expect(mockStorage.loadSettings()).toEqual(DEFAULT_USER_SETTINGS);
		});
	});
});
