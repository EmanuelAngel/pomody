import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
	LocalSettingsStorage,
	SETTINGS_STORAGE_KEY,
	SETTINGS_STORAGE_VERSION,
	type StoredSettingsEnvelope
} from './local-settings-storage';
import { DEFAULT_USER_SETTINGS, type UserSettings } from '../../domain/ports/settings-storage.port';
import { DEFAULT_TIMER_CONFIG } from '../../domain/timer/timer-fsm';

function createMockStorage(initialData: Record<string, string> = {}): Storage {
	const map = new Map<string, string>(Object.entries(initialData));

	return {
		get length(): number {
			return map.size;
		},
		clear(): void {
			map.clear();
		},
		getItem(key: string): string | null {
			return map.get(key) ?? null;
		},
		key(index: number): string | null {
			return Array.from(map.keys())[index] ?? null;
		},
		removeItem(key: string): void {
			map.delete(key);
		},
		setItem(key: string, value: string): void {
			map.set(key, String(value));
		}
	};
}

describe('LocalSettingsStorage', () => {
	let mockStorage: Storage;
	let storageAdapter: LocalSettingsStorage;

	beforeEach(() => {
		mockStorage = createMockStorage();
		storageAdapter = new LocalSettingsStorage(mockStorage);
	});

	describe('Initial & Default Loading', () => {
		it('returns DEFAULT_USER_SETTINGS when storage is empty', () => {
			const settings = storageAdapter.loadSettings();
			expect(settings).toEqual(DEFAULT_USER_SETTINGS);
		});

		it('handles SSR / Node environment when window and localStorage are undefined', () => {
			const ssrAdapter = new LocalSettingsStorage(undefined);
			expect(ssrAdapter.loadSettings()).toEqual(DEFAULT_USER_SETTINGS);
			expect(() => ssrAdapter.saveSettings({ theme: 'dawn' })).not.toThrow();
			expect(() => ssrAdapter.resetSettings()).not.toThrow();
		});

		it('falls back safely when stored payload is malformed JSON', () => {
			mockStorage.setItem(SETTINGS_STORAGE_KEY, 'not-valid-{json');
			const settings = storageAdapter.loadSettings();
			expect(settings).toEqual(DEFAULT_USER_SETTINGS);
		});

		it('falls back safely when stored JSON is a primitive or null', () => {
			mockStorage.setItem(SETTINGS_STORAGE_KEY, 'null');
			expect(storageAdapter.loadSettings()).toEqual(DEFAULT_USER_SETTINGS);

			mockStorage.setItem(SETTINGS_STORAGE_KEY, '12345');
			expect(storageAdapter.loadSettings()).toEqual(DEFAULT_USER_SETTINGS);

			mockStorage.setItem(SETTINGS_STORAGE_KEY, '"hello world"');
			expect(storageAdapter.loadSettings()).toEqual(DEFAULT_USER_SETTINGS);

			mockStorage.setItem(SETTINGS_STORAGE_KEY, '[1, 2, 3]');
			expect(storageAdapter.loadSettings()).toEqual(DEFAULT_USER_SETTINGS);
		});
	});

	describe('Roundtrip Save and Load', () => {
		it('saves and reloads a complete user settings configuration', () => {
			const customSettings: UserSettings = {
				timer: {
					focusDurationSeconds: 1800,
					shortBreakDurationSeconds: 400,
					longBreakDurationSeconds: 1200,
					roundsBeforeLongBreak: 6
				},
				soundEnabled: false,
				theme: 'dawn'
			};

			storageAdapter.saveSettings(customSettings);

			const raw = mockStorage.getItem(SETTINGS_STORAGE_KEY);
			expect(raw).not.toBeNull();

			const envelope: StoredSettingsEnvelope = JSON.parse(raw!);
			expect(envelope.version).toBe(SETTINGS_STORAGE_VERSION);
			expect(envelope.timer).toEqual(customSettings.timer);
			expect(envelope.soundEnabled).toBe(false);
			expect(envelope.theme).toBe('dawn');

			const loaded = storageAdapter.loadSettings();
			expect(loaded).toEqual(customSettings);
		});

		it('supports oled theme in roundtrip', () => {
			storageAdapter.saveSettings({ theme: 'oled' });
			expect(storageAdapter.loadSettings().theme).toBe('oled');
		});
	});

	describe('Partial Save Operations', () => {
		it('preserves sound and theme when updating only timer settings', () => {
			storageAdapter.saveSettings({ theme: 'dawn', soundEnabled: false });

			storageAdapter.saveSettings({
				timer: {
					focusDurationSeconds: 2400,
					shortBreakDurationSeconds: 600,
					longBreakDurationSeconds: 1800,
					roundsBeforeLongBreak: 5
				}
			});

			const loaded = storageAdapter.loadSettings();
			expect(loaded.theme).toBe('dawn');
			expect(loaded.soundEnabled).toBe(false);
			expect(loaded.timer.focusDurationSeconds).toBe(2400);
			expect(loaded.timer.roundsBeforeLongBreak).toBe(5);
		});

		it('preserves timer and sound when updating only theme', () => {
			storageAdapter.saveSettings({
				timer: {
					focusDurationSeconds: 2000,
					shortBreakDurationSeconds: 500,
					longBreakDurationSeconds: 1500,
					roundsBeforeLongBreak: 3
				},
				soundEnabled: false
			});

			storageAdapter.saveSettings({ theme: 'oled' });

			const loaded = storageAdapter.loadSettings();
			expect(loaded.theme).toBe('oled');
			expect(loaded.soundEnabled).toBe(false);
			expect(loaded.timer.focusDurationSeconds).toBe(2000);
			expect(loaded.timer.shortBreakDurationSeconds).toBe(500);
		});

		it('preserves other timer fields when updating a single timer field', () => {
			storageAdapter.saveSettings({
				timer: {
					focusDurationSeconds: 1800,
					shortBreakDurationSeconds: 300,
					longBreakDurationSeconds: 900,
					roundsBeforeLongBreak: 4
				}
			});

			storageAdapter.saveSettings({
				timer: {
					focusDurationSeconds: 3000
				} as unknown as UserSettings['timer']
			});

			const loaded = storageAdapter.loadSettings();
			expect(loaded.timer.focusDurationSeconds).toBe(3000);
			expect(loaded.timer.shortBreakDurationSeconds).toBe(300);
			expect(loaded.timer.longBreakDurationSeconds).toBe(900);
			expect(loaded.timer.roundsBeforeLongBreak).toBe(4);
		});
	});

	describe('Defensive Validation and Field-by-Field Fallbacks', () => {
		it('falls back out-of-bounds fields individually while preserving valid fields', () => {
			mockStorage.setItem(
				SETTINGS_STORAGE_KEY,
				JSON.stringify({
					version: 1,
					timer: {
						focusDurationSeconds: -500,
						shortBreakDurationSeconds: 300,
						longBreakDurationSeconds: 900,
						roundsBeforeLongBreak: 4
					},
					soundEnabled: true,
					theme: 'dawn'
				})
			);

			const loaded = storageAdapter.loadSettings();
			expect(loaded.timer.focusDurationSeconds).toBe(DEFAULT_TIMER_CONFIG.focusDurationSeconds);
			expect(loaded.timer.shortBreakDurationSeconds).toBe(300);
			expect(loaded.theme).toBe('dawn');
			expect(loaded.soundEnabled).toBe(true);
		});

		it('falls back missing fields in JSON payload individually to defaults', () => {
			mockStorage.setItem(
				SETTINGS_STORAGE_KEY,
				JSON.stringify({
					version: 1,
					timer: {
						focusDurationSeconds: 1800
					}
				})
			);

			const loaded = storageAdapter.loadSettings();
			expect(loaded.timer.focusDurationSeconds).toBe(1800);
			expect(loaded.timer.shortBreakDurationSeconds).toBe(
				DEFAULT_TIMER_CONFIG.shortBreakDurationSeconds
			);
			expect(loaded.timer.longBreakDurationSeconds).toBe(
				DEFAULT_TIMER_CONFIG.longBreakDurationSeconds
			);
			expect(loaded.timer.roundsBeforeLongBreak).toBe(DEFAULT_TIMER_CONFIG.roundsBeforeLongBreak);
			expect(loaded.soundEnabled).toBe(DEFAULT_USER_SETTINGS.soundEnabled);
			expect(loaded.theme).toBe(DEFAULT_USER_SETTINGS.theme);
		});

		it('validates focusDurationSeconds boundary [60, 3600]', () => {
			// Below minimum (59)
			mockStorage.setItem(
				SETTINGS_STORAGE_KEY,
				JSON.stringify({ timer: { focusDurationSeconds: 59 } })
			);
			expect(storageAdapter.loadSettings().timer.focusDurationSeconds).toBe(1500);

			// Lower bound (60)
			mockStorage.setItem(
				SETTINGS_STORAGE_KEY,
				JSON.stringify({ timer: { focusDurationSeconds: 60 } })
			);
			expect(storageAdapter.loadSettings().timer.focusDurationSeconds).toBe(60);

			// Upper bound (3600)
			mockStorage.setItem(
				SETTINGS_STORAGE_KEY,
				JSON.stringify({ timer: { focusDurationSeconds: 3600 } })
			);
			expect(storageAdapter.loadSettings().timer.focusDurationSeconds).toBe(3600);

			// Above maximum (3601)
			mockStorage.setItem(
				SETTINGS_STORAGE_KEY,
				JSON.stringify({ timer: { focusDurationSeconds: 3601 } })
			);
			expect(storageAdapter.loadSettings().timer.focusDurationSeconds).toBe(1500);

			// Non-integer float
			mockStorage.setItem(
				SETTINGS_STORAGE_KEY,
				JSON.stringify({ timer: { focusDurationSeconds: 1500.5 } })
			);
			expect(storageAdapter.loadSettings().timer.focusDurationSeconds).toBe(1500);
		});

		it('validates shortBreakDurationSeconds boundary [60, 1800]', () => {
			// Below minimum (59)
			mockStorage.setItem(
				SETTINGS_STORAGE_KEY,
				JSON.stringify({ timer: { shortBreakDurationSeconds: 59 } })
			);
			expect(storageAdapter.loadSettings().timer.shortBreakDurationSeconds).toBe(300);

			// Lower bound (60)
			mockStorage.setItem(
				SETTINGS_STORAGE_KEY,
				JSON.stringify({ timer: { shortBreakDurationSeconds: 60 } })
			);
			expect(storageAdapter.loadSettings().timer.shortBreakDurationSeconds).toBe(60);

			// Upper bound (1800)
			mockStorage.setItem(
				SETTINGS_STORAGE_KEY,
				JSON.stringify({ timer: { shortBreakDurationSeconds: 1800 } })
			);
			expect(storageAdapter.loadSettings().timer.shortBreakDurationSeconds).toBe(1800);

			// Above maximum (1801)
			mockStorage.setItem(
				SETTINGS_STORAGE_KEY,
				JSON.stringify({ timer: { shortBreakDurationSeconds: 1801 } })
			);
			expect(storageAdapter.loadSettings().timer.shortBreakDurationSeconds).toBe(300);
		});

		it('validates longBreakDurationSeconds boundary [60, 3600]', () => {
			// Below minimum (59)
			mockStorage.setItem(
				SETTINGS_STORAGE_KEY,
				JSON.stringify({ timer: { longBreakDurationSeconds: 59 } })
			);
			expect(storageAdapter.loadSettings().timer.longBreakDurationSeconds).toBe(900);

			// Lower bound (60)
			mockStorage.setItem(
				SETTINGS_STORAGE_KEY,
				JSON.stringify({ timer: { longBreakDurationSeconds: 60 } })
			);
			expect(storageAdapter.loadSettings().timer.longBreakDurationSeconds).toBe(60);

			// Upper bound (3600)
			mockStorage.setItem(
				SETTINGS_STORAGE_KEY,
				JSON.stringify({ timer: { longBreakDurationSeconds: 3600 } })
			);
			expect(storageAdapter.loadSettings().timer.longBreakDurationSeconds).toBe(3600);

			// Above maximum (3601)
			mockStorage.setItem(
				SETTINGS_STORAGE_KEY,
				JSON.stringify({ timer: { longBreakDurationSeconds: 3601 } })
			);
			expect(storageAdapter.loadSettings().timer.longBreakDurationSeconds).toBe(900);
		});

		it('validates roundsBeforeLongBreak boundary [1, 12]', () => {
			// Below minimum (0)
			mockStorage.setItem(
				SETTINGS_STORAGE_KEY,
				JSON.stringify({ timer: { roundsBeforeLongBreak: 0 } })
			);
			expect(storageAdapter.loadSettings().timer.roundsBeforeLongBreak).toBe(4);

			// Lower bound (1)
			mockStorage.setItem(
				SETTINGS_STORAGE_KEY,
				JSON.stringify({ timer: { roundsBeforeLongBreak: 1 } })
			);
			expect(storageAdapter.loadSettings().timer.roundsBeforeLongBreak).toBe(1);

			// Upper bound (12)
			mockStorage.setItem(
				SETTINGS_STORAGE_KEY,
				JSON.stringify({ timer: { roundsBeforeLongBreak: 12 } })
			);
			expect(storageAdapter.loadSettings().timer.roundsBeforeLongBreak).toBe(12);

			// Above maximum (13)
			mockStorage.setItem(
				SETTINGS_STORAGE_KEY,
				JSON.stringify({ timer: { roundsBeforeLongBreak: 13 } })
			);
			expect(storageAdapter.loadSettings().timer.roundsBeforeLongBreak).toBe(4);
		});

		it('validates soundEnabled boolean type', () => {
			mockStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify({ soundEnabled: false }));
			expect(storageAdapter.loadSettings().soundEnabled).toBe(false);

			mockStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify({ soundEnabled: 'false' }));
			expect(storageAdapter.loadSettings().soundEnabled).toBe(true);

			mockStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify({ soundEnabled: 0 }));
			expect(storageAdapter.loadSettings().soundEnabled).toBe(true);
		});

		it('validates theme type and falls back invalid themes to default dark', () => {
			mockStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify({ theme: 'invalid-theme' }));
			expect(storageAdapter.loadSettings().theme).toBe('dark');

			mockStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify({ theme: '' }));
			expect(storageAdapter.loadSettings().theme).toBe('dark');

			mockStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify({ theme: 123 }));
			expect(storageAdapter.loadSettings().theme).toBe('dark');
		});

		it('sanitizes out-of-bounds fields when saving patch', () => {
			storageAdapter.saveSettings({
				timer: {
					focusDurationSeconds: 99999
				} as unknown as UserSettings['timer']
			});

			const loaded = storageAdapter.loadSettings();
			expect(loaded.timer.focusDurationSeconds).toBe(1500);
		});
	});

	describe('Reset Operation', () => {
		it('removes stored settings from storage', () => {
			storageAdapter.saveSettings({ theme: 'dawn' });
			expect(mockStorage.getItem(SETTINGS_STORAGE_KEY)).not.toBeNull();

			storageAdapter.resetSettings();
			expect(mockStorage.getItem(SETTINGS_STORAGE_KEY)).toBeNull();
			expect(storageAdapter.loadSettings()).toEqual(DEFAULT_USER_SETTINGS);
		});
	});

	describe('Resilience and Exception Handling', () => {
		it('handles SecurityError on getItem gracefully without throwing', () => {
			const throwingStorage: Storage = {
				...mockStorage,
				getItem: vi.fn().mockImplementation(() => {
					throw new DOMException('The operation is insecure.', 'SecurityError');
				})
			};

			const adapter = new LocalSettingsStorage(throwingStorage);
			expect(() => adapter.loadSettings()).not.toThrow();
			expect(adapter.loadSettings()).toEqual(DEFAULT_USER_SETTINGS);
		});

		it('handles QuotaExceededError or DOMException on setItem gracefully without throwing', () => {
			const throwingStorage: Storage = {
				...mockStorage,
				setItem: vi.fn().mockImplementation(() => {
					throw new DOMException('The quota has been exceeded.', 'QuotaExceededError');
				})
			};

			const adapter = new LocalSettingsStorage(throwingStorage);
			expect(() => adapter.saveSettings({ theme: 'dawn' })).not.toThrow();
		});

		it('handles SecurityError on removeItem gracefully without throwing', () => {
			const throwingStorage: Storage = {
				...mockStorage,
				removeItem: vi.fn().mockImplementation(() => {
					throw new DOMException('The operation is insecure.', 'SecurityError');
				})
			};

			const adapter = new LocalSettingsStorage(throwingStorage);
			expect(() => adapter.resetSettings()).not.toThrow();
		});
	});
});
