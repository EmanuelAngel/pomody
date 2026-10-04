import {
	DEFAULT_USER_SETTINGS,
	type ISettingsStorage,
	type UserSettings
} from '$lib/domain/ports/settings-storage.port';

/**
 * In-memory test fake implementing ISettingsStorage.
 * Synchronous stateful persistence for user configuration, deep-merging timer preferences
 * and restoring defaults upon reset.
 */
export class FakeSettingsStorage implements ISettingsStorage {
	private settings: UserSettings;
	public saveSettingsCalls: Partial<UserSettings>[] = [];
	public resetSettingsCalls = 0;

	constructor(initialSettings: Partial<UserSettings> = {}) {
		this.settings = {
			...DEFAULT_USER_SETTINGS,
			...initialSettings,
			timer: {
				...DEFAULT_USER_SETTINGS.timer,
				...(initialSettings.timer ?? {})
			}
		};
	}

	loadSettings(): UserSettings {
		return {
			...this.settings,
			timer: { ...this.settings.timer }
		};
	}

	saveSettings(patch: Partial<UserSettings>): void {
		this.saveSettingsCalls.push(patch);
		this.settings = {
			...this.settings,
			...patch,
			timer: patch.timer ? { ...this.settings.timer, ...patch.timer } : this.settings.timer
		};
	}

	resetSettings(): void {
		this.resetSettingsCalls++;
		this.settings = {
			...DEFAULT_USER_SETTINGS,
			timer: { ...DEFAULT_USER_SETTINGS.timer }
		};
	}
}
