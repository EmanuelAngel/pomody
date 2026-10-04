import { describe, it, expect } from 'vitest';
import { FakeSettingsStorage } from '$tests/fakes/repositories/fake-settings-storage';
import { DEFAULT_TIMER_CONFIG } from '../timer/timer-fsm';
import { DEFAULT_USER_SETTINGS, THEMES, type ISettingsStorage } from './settings-storage.port';

describe('Settings Storage Port & UserSettings Model', () => {
	describe('THEMES', () => {
		it('should include dark, dawn, and oled theme identifiers', () => {
			expect(THEMES).toEqual(['dark', 'dawn', 'oled']);
		});
	});

	describe('DEFAULT_USER_SETTINGS', () => {
		it('should match DEFAULT_TIMER_CONFIG, soundEnabled true, revitalizationEnabled true, and dark theme', () => {
			expect(DEFAULT_USER_SETTINGS).toEqual({
				timer: DEFAULT_TIMER_CONFIG,
				soundEnabled: true,
				revitalizationEnabled: true,
				theme: 'dark'
			});
			expect(DEFAULT_USER_SETTINGS.timer).toBe(DEFAULT_TIMER_CONFIG);
			expect(DEFAULT_USER_SETTINGS.soundEnabled).toBe(true);
			expect(DEFAULT_USER_SETTINGS.revitalizationEnabled).toBe(true);
			expect(DEFAULT_USER_SETTINGS.theme).toBe('dark');
		});

		it('should be frozen to prevent unintended mutations', () => {
			expect(Object.isFrozen(DEFAULT_USER_SETTINGS)).toBe(true);
			expect(Object.isFrozen(DEFAULT_USER_SETTINGS.timer)).toBe(true);
		});
	});

	describe('ISettingsStorage contract compilation', () => {
		it('should allow valid implementation satisfying the port contract', () => {
			const storage: ISettingsStorage = new FakeSettingsStorage();

			expect(storage.loadSettings()).toEqual(DEFAULT_USER_SETTINGS);

			storage.saveSettings({
				theme: 'dawn',
				soundEnabled: false,
				revitalizationEnabled: false
			});
			expect(storage.loadSettings().theme).toBe('dawn');
			expect(storage.loadSettings().soundEnabled).toBe(false);
			expect(storage.loadSettings().revitalizationEnabled).toBe(false);

			storage.resetSettings();
			expect(storage.loadSettings()).toEqual(DEFAULT_USER_SETTINGS);
		});
	});
});
