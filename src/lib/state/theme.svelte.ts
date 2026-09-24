export type Theme = 'dark' | 'dawn' | 'oled';

export const THEMES: readonly Theme[] = ['dark', 'dawn', 'oled'] as const;

/**
 * Reactive theme state managing Rosé Pine palettes and DOM theme synchronization.
 * Exposes fine-grained reactive state via Svelte 5 Runes ($state).
 */
export class ThemeState {
	private _theme = $state<Theme>('dark');

	constructor(initialTheme: Theme = 'dark') {
		this._theme = initialTheme;
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
	}
}

/**
 * Factory function to create isolated ThemeState instances (useful for testing or sub-contexts).
 */
export function createThemeState(initialTheme?: Theme): ThemeState {
	return new ThemeState(initialTheme);
}

/**
 * Global singleton reactive theme state instance for the application.
 */
export const themeState = new ThemeState();
