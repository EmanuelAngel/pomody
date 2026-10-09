import type { IWindowShell, WindowDimensions } from '../../domain/ports/window-shell.port';

/**
 * IWindowShell adapter for the web build.
 * Browsers cannot resize or pin the OS window, so every operation degrades to a safe no-op:
 * no native call is made, no DOM global is touched, and no error is thrown.
 */
export class WebWindowShell implements IWindowShell {
	/** The web platform never supports native window manipulation. */
	public readonly isSupported = false;

	/**
	 * Accepts the requested dimensions for interface compatibility and ignores them:
	 * the browser exposes no window sizing API.
	 */
	public async enterMiniPlayer(dimensions?: WindowDimensions): Promise<void> {
		void dimensions;
	}

	public async restoreMainWindow(): Promise<void> {
		return;
	}

	public async isAlwaysOnTop(): Promise<boolean> {
		return false;
	}
}
