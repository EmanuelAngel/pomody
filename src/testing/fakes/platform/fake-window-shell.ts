import {
	MINI_WINDOW_DIMENSIONS,
	type IWindowShell,
	type WindowDimensions
} from '$lib/domain/ports/window-shell.port';

export interface FakeWindowShellOptions {
	/** Simulates an unsupported platform. Defaults to `true`. */
	readonly isSupported?: boolean;
}

/**
 * In-memory test fake implementing IWindowShell.
 * Simulates the native window transitions without any Tauri or DOM dependency,
 * exposing call counters and the last requested dimensions for assertions.
 */
export class FakeWindowShell implements IWindowShell {
	public isSupported: boolean;
	public isMini = false;
	public alwaysOnTop = false;
	public enterMiniPlayerCallCount = 0;
	public restoreMainWindowCallCount = 0;
	public isAlwaysOnTopCallCount = 0;
	public lastDimensions?: WindowDimensions;

	constructor(options: FakeWindowShellOptions = {}) {
		this.isSupported = options.isSupported ?? true;
	}

	public async enterMiniPlayer(
		dimensions: WindowDimensions = MINI_WINDOW_DIMENSIONS
	): Promise<void> {
		this.isMini = true;
		this.alwaysOnTop = true;
		this.lastDimensions = { ...dimensions };
		this.enterMiniPlayerCallCount++;
	}

	public async restoreMainWindow(): Promise<void> {
		this.isMini = false;
		this.alwaysOnTop = false;
		this.restoreMainWindowCallCount++;
	}

	public async isAlwaysOnTop(): Promise<boolean> {
		this.isAlwaysOnTopCallCount++;
		return this.alwaysOnTop;
	}

	/**
	 * Resets all internal state, call counters, and recorded dimensions.
	 */
	public reset(): void {
		this.isMini = false;
		this.alwaysOnTop = false;
		this.enterMiniPlayerCallCount = 0;
		this.restoreMainWindowCallCount = 0;
		this.isAlwaysOnTopCallCount = 0;
		this.lastDimensions = undefined;
	}
}
