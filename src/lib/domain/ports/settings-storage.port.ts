import { DEFAULT_TIMER_CONFIG, type TimerConfig } from '../timer/timer-fsm';

export type Theme = 'dark' | 'dawn' | 'oled';

export const THEMES: readonly Theme[] = ['dark', 'dawn', 'oled'] as const;

/**
 * User configuration preferences for Pomody.
 */
export interface UserSettings {
	readonly timer: TimerConfig;
	readonly soundEnabled: boolean;
	readonly theme: Theme;
}

/**
 * Default fallback configuration for user settings.
 */
export const DEFAULT_USER_SETTINGS: UserSettings = Object.freeze({
	timer: DEFAULT_TIMER_CONFIG,
	soundEnabled: true,
	theme: 'dark'
});

/**
 * Pure domain port defining operations to load, save, and reset user preferences.
 */
export interface ISettingsStorage {
	/**
	 * Loads persisted user settings, falling back to defaults for any missing/corrupt values.
	 */
	loadSettings(): UserSettings;

	/**
	 * Persists a partial or full set of user settings.
	 */
	saveSettings(patch: Partial<UserSettings>): void;

	/**
	 * Clears stored settings and restores defaults.
	 */
	resetSettings(): void;
}
