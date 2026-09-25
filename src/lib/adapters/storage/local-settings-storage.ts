import {
	DEFAULT_USER_SETTINGS,
	type ISettingsStorage,
	type UserSettings,
	type Theme
} from '../../domain/ports/settings-storage.port';
import { DEFAULT_TIMER_CONFIG, type TimerConfig } from '../../domain/timer/timer-fsm';

export const SETTINGS_STORAGE_KEY = 'pomody:settings';
export const SETTINGS_STORAGE_VERSION = 1;

export const SETTINGS_BOUNDS = {
	focusDuration: { min: 60, max: 3600 },
	shortBreakDuration: { min: 60, max: 1800 },
	longBreakDuration: { min: 60, max: 3600 },
	roundsBeforeLongBreak: { min: 1, max: 12 }
} as const;

export interface StoredSettingsEnvelope {
	readonly version: number;
	readonly timer: TimerConfig;
	readonly soundEnabled: boolean;
	readonly theme: Theme;
}

function isValidIntegerInRange(value: unknown, min: number, max: number): value is number {
	return typeof value === 'number' && Number.isInteger(value) && value >= min && value <= max;
}

function isValidBoolean(value: unknown): value is boolean {
	return typeof value === 'boolean';
}

function isValidTheme(value: unknown): value is Theme {
	return value === 'dark' || value === 'dawn' || value === 'oled';
}

/**
 * Browser LocalStorage implementation of ISettingsStorage.
 * Persists user configuration in a versioned envelope with defensive validation and fallback.
 * Safe for use in SSR/Node and resilient against storage exceptions (e.g. QuotaExceededError, SecurityError).
 */
export class LocalSettingsStorage implements ISettingsStorage {
	private readonly injectedStorage?: Storage;

	constructor(storage?: Storage) {
		this.injectedStorage = storage;
	}

	private getStorage(): Storage | null {
		if (this.injectedStorage !== undefined) {
			return this.injectedStorage;
		}

		if (typeof window !== 'undefined' && typeof window.localStorage !== 'undefined') {
			try {
				return window.localStorage;
			} catch {
				return null;
			}
		}

		return null;
	}

	/**
	 * Loads persisted user settings from storage.
	 * Returns DEFAULT_USER_SETTINGS if storage is empty, inaccessible, or invalid JSON.
	 * Performs field-by-field validation, falling back individual corrupt or out-of-bounds fields to defaults.
	 */
	public loadSettings(): UserSettings {
		const storage = this.getStorage();
		if (!storage) {
			return DEFAULT_USER_SETTINGS;
		}

		let raw: string | null;
		try {
			raw = storage.getItem(SETTINGS_STORAGE_KEY);
		} catch {
			return DEFAULT_USER_SETTINGS;
		}

		if (!raw) {
			return DEFAULT_USER_SETTINGS;
		}

		let parsed: unknown;
		try {
			parsed = JSON.parse(raw);
		} catch {
			return DEFAULT_USER_SETTINGS;
		}

		if (typeof parsed !== 'object' || parsed === null) {
			return DEFAULT_USER_SETTINGS;
		}

		return this.validateAndSanitize(parsed);
	}

	/**
	 * Persists updated user settings.
	 * Merges patch with current settings, validates fields, and stores them in a versioned envelope.
	 */
	public saveSettings(patch: Partial<UserSettings>): void {
		const storage = this.getStorage();
		if (!storage) {
			return;
		}

		const current = this.loadSettings();
		const patchTimer = patch.timer && typeof patch.timer === 'object' ? patch.timer : undefined;

		const mergedCandidate: Record<string, unknown> = {
			timer: {
				...current.timer,
				...patchTimer
			},
			soundEnabled: patch.soundEnabled !== undefined ? patch.soundEnabled : current.soundEnabled,
			theme: patch.theme !== undefined ? patch.theme : current.theme
		};

		const validated = this.validateAndSanitize(mergedCandidate);

		const envelope: StoredSettingsEnvelope = {
			version: SETTINGS_STORAGE_VERSION,
			timer: validated.timer,
			soundEnabled: validated.soundEnabled,
			theme: validated.theme
		};

		try {
			storage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(envelope));
		} catch {
			// Gracefully handle DOMException / SecurityError / QuotaExceededError
		}
	}

	/**
	 * Clears stored settings item from storage.
	 */
	public resetSettings(): void {
		const storage = this.getStorage();
		if (!storage) {
			return;
		}

		try {
			storage.removeItem(SETTINGS_STORAGE_KEY);
		} catch {
			// Gracefully handle DOMException / SecurityError
		}
	}

	/**
	 * Validates settings and falls back individual out-of-bounds or corrupt fields to defaults.
	 */
	private validateAndSanitize(candidate: unknown): UserSettings {
		if (typeof candidate !== 'object' || candidate === null) {
			return DEFAULT_USER_SETTINGS;
		}

		const obj = candidate as Record<string, unknown>;
		const timerObj =
			typeof obj.timer === 'object' && obj.timer !== null
				? (obj.timer as Record<string, unknown>)
				: obj;

		const focusDurationSeconds = isValidIntegerInRange(
			timerObj.focusDurationSeconds,
			SETTINGS_BOUNDS.focusDuration.min,
			SETTINGS_BOUNDS.focusDuration.max
		)
			? timerObj.focusDurationSeconds
			: DEFAULT_TIMER_CONFIG.focusDurationSeconds;

		const shortBreakDurationSeconds = isValidIntegerInRange(
			timerObj.shortBreakDurationSeconds,
			SETTINGS_BOUNDS.shortBreakDuration.min,
			SETTINGS_BOUNDS.shortBreakDuration.max
		)
			? timerObj.shortBreakDurationSeconds
			: DEFAULT_TIMER_CONFIG.shortBreakDurationSeconds;

		const longBreakDurationSeconds = isValidIntegerInRange(
			timerObj.longBreakDurationSeconds,
			SETTINGS_BOUNDS.longBreakDuration.min,
			SETTINGS_BOUNDS.longBreakDuration.max
		)
			? timerObj.longBreakDurationSeconds
			: DEFAULT_TIMER_CONFIG.longBreakDurationSeconds;

		const roundsBeforeLongBreak = isValidIntegerInRange(
			timerObj.roundsBeforeLongBreak,
			SETTINGS_BOUNDS.roundsBeforeLongBreak.min,
			SETTINGS_BOUNDS.roundsBeforeLongBreak.max
		)
			? timerObj.roundsBeforeLongBreak
			: DEFAULT_TIMER_CONFIG.roundsBeforeLongBreak;

		const soundEnabled = isValidBoolean(obj.soundEnabled)
			? obj.soundEnabled
			: DEFAULT_USER_SETTINGS.soundEnabled;

		const theme = isValidTheme(obj.theme) ? obj.theme : DEFAULT_USER_SETTINGS.theme;

		return {
			timer: {
				focusDurationSeconds,
				shortBreakDurationSeconds,
				longBreakDurationSeconds,
				roundsBeforeLongBreak
			},
			soundEnabled,
			theme
		};
	}
}
