import { describe, it, expect } from 'vitest';
import { FakeSettingsStorage } from '$tests/fakes/repositories/fake-settings-storage';
import { DEFAULT_USER_SETTINGS } from '$lib/domain/ports/settings-storage.port';

describe('FakeSettingsStorage', () => {
	it('initializes with DEFAULT_USER_SETTINGS by default', () => {
		const storage = new FakeSettingsStorage();
		expect(storage.loadSettings()).toEqual(DEFAULT_USER_SETTINGS);
	});

	it('merges partial initialSettings, including nested timer overrides', () => {
		const storage = new FakeSettingsStorage({
			soundEnabled: false,
			theme: 'dawn',
			timer: {
				...DEFAULT_USER_SETTINGS.timer,
				focusDurationSeconds: 1800
			}
		});

		const loaded = storage.loadSettings();
		expect(loaded.soundEnabled).toBe(false);
		expect(loaded.theme).toBe('dawn');
		expect(loaded.timer.focusDurationSeconds).toBe(1800);
		expect(loaded.timer.shortBreakDurationSeconds).toBe(
			DEFAULT_USER_SETTINGS.timer.shortBreakDurationSeconds
		);
	});

	it('saves patch with deep timer merge and tracks calls', () => {
		const storage = new FakeSettingsStorage();

		storage.saveSettings({
			theme: 'oled',
			timer: {
				...DEFAULT_USER_SETTINGS.timer,
				shortBreakDurationSeconds: 600
			}
		});

		const loaded = storage.loadSettings();
		expect(loaded.theme).toBe('oled');
		expect(loaded.timer.shortBreakDurationSeconds).toBe(600);
		expect(loaded.timer.focusDurationSeconds).toBe(
			DEFAULT_USER_SETTINGS.timer.focusDurationSeconds
		);
		expect(storage.saveSettingsCalls).toHaveLength(1);
	});

	it('resets settings back to defaults', () => {
		const storage = new FakeSettingsStorage({
			theme: 'oled',
			soundEnabled: false
		});

		storage.resetSettings();

		expect(storage.resetSettingsCalls).toBe(1);
		expect(storage.loadSettings()).toEqual(DEFAULT_USER_SETTINGS);
	});

	it('returns defensive copies from loadSettings to prevent external mutations', () => {
		const storage = new FakeSettingsStorage();
		const settings1 = storage.loadSettings();

		// Attempt mutation on returned object
		(settings1 as { soundEnabled: boolean }).soundEnabled = false;

		const settings2 = storage.loadSettings();
		expect(settings2.soundEnabled).toBe(true);
	});
});
