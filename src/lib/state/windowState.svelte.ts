import { MINI_WINDOW_DIMENSIONS, type IWindowShell } from '../domain/ports/window-shell.port';
import { TauriWindowShell, isTauriRuntimeAvailable } from '../adapters/window/tauri-window-shell';
import { WebWindowShell } from '../adapters/window/web-window-shell';

/**
 * Reactive state managing the compact Mini-Player window mode with Svelte 5 Runes ($state).
 * Owns no native logic: every window mutation is delegated to the injected IWindowShell,
 * and the flags only flip once the shell call resolves.
 */
export class WindowState {
	public isMiniPlayer = $state(false);
	public isAlwaysOnTop = $state(false);

	constructor(public readonly shell: IWindowShell) {}

	/**
	 * Enters mini mode when in main window mode, and restores the main window otherwise.
	 * No-ops when the platform does not support native window manipulation.
	 */
	public async toggleMiniPlayer(): Promise<void> {
		if (!this.shell.isSupported) return;

		if (this.isMiniPlayer) {
			await this.restore();
			return;
		}

		await this.shell.enterMiniPlayer(MINI_WINDOW_DIMENSIONS);
		this.isMiniPlayer = true;
		this.isAlwaysOnTop = true;
	}

	/**
	 * Restores the main window. Idempotent: does nothing when not in mini mode.
	 */
	public async restore(): Promise<void> {
		if (!this.isMiniPlayer) return;

		await this.shell.restoreMainWindow();
		this.isMiniPlayer = false;
		this.isAlwaysOnTop = false;
	}
}

/**
 * Selects the shell matching the current runtime: Tauri on desktop, safe no-op on the web.
 */
export function createDefaultWindowShell(): IWindowShell {
	return isTauriRuntimeAvailable() ? new TauriWindowShell() : new WebWindowShell();
}

/**
 * Factory function to create isolated WindowState instances (useful for testing or sub-contexts).
 */
export function createWindowState(shell: IWindowShell = createDefaultWindowShell()): WindowState {
	return new WindowState(shell);
}

/**
 * Global singleton reactive window state instance for the application.
 */
export const windowState = createWindowState();
