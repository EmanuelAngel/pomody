import { DEFAULT_TIMER_CONFIG, type TimerConfig } from '../timer/timer-fsm';
import { DEFAULT_ILLUSTRATION_ID, type IllustrationId } from '../illustration/illustration-catalog';

export type Theme = 'dark' | 'dawn' | 'oled';

export const THEMES: readonly Theme[] = ['dark', 'dawn', 'oled'] as const;

/**
 * Preferences of the living companion illustration shown behind the timer.
 */
export interface IllustrationSettings {
	/** Master switch. Off by default: the illustration is opt-in. */
	readonly enabled: boolean;
	/** Ambient motion switch. When off, the scene stays static. */
	readonly motionEnabled: boolean;
	/** Hides the illustration while a focus block is running. */
	readonly hideWhileFocusing: boolean;
	readonly selectedId: IllustrationId;
}

export const DEFAULT_ILLUSTRATION_SETTINGS: IllustrationSettings = Object.freeze({
	enabled: false,
	motionEnabled: true,
	hideWhileFocusing: false,
	selectedId: DEFAULT_ILLUSTRATION_ID
});

/**
 * User configuration preferences for Pomody.
 */
export interface UserSettings {
	readonly timer: TimerConfig;
	readonly soundEnabled: boolean;
	readonly revitalizationEnabled: boolean;
	/** Global switch of the distraction detector. Off by default: the user opts in. */
	readonly distractionDetectorEnabled: boolean;
	readonly theme: Theme;
	readonly illustration: IllustrationSettings;
}

/**
 * Default fallback configuration for user settings.
 */
export const DEFAULT_USER_SETTINGS: UserSettings = Object.freeze({
	timer: DEFAULT_TIMER_CONFIG,
	soundEnabled: true,
	revitalizationEnabled: true,
	distractionDetectorEnabled: false,
	theme: 'dark',
	illustration: DEFAULT_ILLUSTRATION_SETTINGS
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
