export type NavigationTab = 'timer' | 'planning';

/**
 * Reactive navigation state managing view switching in Pomody with Svelte 5 Runes ($state).
 */
export class NavigationState {
	private _activeTab = $state<NavigationTab>('timer');

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
