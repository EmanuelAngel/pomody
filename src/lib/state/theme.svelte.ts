import { THEMES, type Theme, type ISettingsStorage } from '../domain/ports/settings-storage.port';
import { LocalSettingsStorage } from '../adapters/storage/local-settings-storage';

export { THEMES, type Theme };

/**
 * Reactive theme state managing Rosé Pine palettes and DOM theme synchronization.
 * Exposes fine-grained reactive state via Svelte 5 Runes ($state).
 */
export class ThemeState {
	private readonly storage?: ISettingsStorage;
	private _theme = $state<Theme>('dark');

	constructor(initialTheme?: Theme, storage?: ISettingsStorage) {
		this.storage = storage;
		if (initialTheme !== undefined) {
			this._theme = initialTheme;
		} else if (storage !== undefined) {
			this._theme = storage.loadSettings().theme;
		} else {
			this._theme = 'dark';
		}

		if (typeof document !== 'undefined') {
			document.documentElement.dataset.theme = this._theme;
		}
	}

	public get current(): Theme {
		return this._theme;
	}

	/**
	 * Updates the active theme and synchronizes with document dataset attribute.
	 */
	public setTheme(theme: Theme): void {
		this._theme = theme;
		if (typeof document !== 'undefined') {
			document.documentElement.dataset.theme = theme;
		}
		this.storage?.saveSettings({ theme });
	}
}

/**
 * Factory function to create isolated ThemeState instances (useful for testing or sub-contexts).
 */
export function createThemeState(initialTheme?: Theme, storage?: ISettingsStorage): ThemeState {
	return new ThemeState(initialTheme, storage);
}

/**
 * Global singleton reactive theme state instance for the application.
 */
export const themeState = new ThemeState(undefined, new LocalSettingsStorage());
