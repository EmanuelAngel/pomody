export type NavigationTab = 'timer' | 'planning' | 'distractions' | 'metrics';

/** Tabs of the Settings dialog; `initialTab` of the dialog and the header's shortcuts speak this union. */
export type SettingsTab =
	'intervals' | 'appearance' | 'companion' | 'behavior' | 'metrics' | 'application';

/** A view asking the shell to open Settings; `id` makes every request distinct, even for the same tab. */
export interface SettingsRequest {
	readonly id: number;
	readonly tab: SettingsTab;
}

/**
 * Reactive navigation state managing view switching in Pomody with Svelte 5 Runes ($state).
 */
export class NavigationState {
	private _activeTab = $state<NavigationTab>('timer');
	private _settingsRequest = $state<SettingsRequest | null>(null);
	private _lastRequestId = 0;

	constructor(initialTab: NavigationTab = 'timer') {
		this._activeTab = initialTab;
	}

	public get activeTab(): NavigationTab {
		return this._activeTab;
	}

	public set activeTab(tab: NavigationTab) {
		this._activeTab = tab;
	}

	public setTab(tab: NavigationTab): void {
		this._activeTab = tab;
	}

	/** The latest request to open Settings, or null if none was made. The shell consumes it. */
	public get settingsRequest(): SettingsRequest | null {
		return this._settingsRequest;
	}

	/** Asks the shell, which owns the Settings dialog, to open it on `tab`. */
	public requestSettings(tab: SettingsTab): void {
		this._lastRequestId += 1;
		this._settingsRequest = { id: this._lastRequestId, tab };
	}
}

/**
 * Factory function to create isolated NavigationState instances (useful for testing or sub-contexts).
 */
export function createNavigationState(initialTab: NavigationTab = 'timer'): NavigationState {
	return new NavigationState(initialTab);
}

/**
 * Global singleton reactive navigation state instance for the application.
 */
export const navigationState = new NavigationState();
