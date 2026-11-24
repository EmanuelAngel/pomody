import type { IWindowShell, WindowDimensions } from '../../domain/ports/window-shell.port';

/**
 * IWindowShell adapter for the web build.
 * Browsers cannot resize, pin, minimize, maximize or close the OS window, so every operation
 * degrades to a safe no-op: no native call is made, no DOM global is touched, and no error is
 * thrown.
 *
 * The window controls of the title bar strip are explicitly inert here for the same reason:
 * the strip is decoration in a browser tab, and `close()` in particular must never degrade to
 * `window.close()`, which no browser honours for a tab the script did not open.
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

	/** No-op: the browser cannot minimize the window. */
	public async minimize(): Promise<void> {
		return;
	}

	/** No-op: the browser cannot maximize the window. */
	public async toggleMaximize(): Promise<void> {
		return;
	}

	/** No-op: the tab cannot close itself, so nothing is attempted. */
	public async close(): Promise<void> {
		return;
	}

	/** Always false: without native windows there is no maximized state. */
	public async isMaximized(): Promise<boolean> {
		return false;
	}

	/** Resolves with an unsubscribe that never fires, because no change is ever reported. */
	public async onMaximizedChange(handler: (maximized: boolean) => void): Promise<() => void> {
		void handler;
		return () => {};
	}
}
