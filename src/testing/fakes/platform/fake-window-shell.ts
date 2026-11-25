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
 *
 * The window controls are simulated rather than recorded as bare counters: the maximized
 * state is the one the strip renders, so {@link toggleMaximize} flips it and notifies the
 * subscribers exactly like the native adapter does. {@link emitMaximizedChange} plays the
 * part of the OS (`Win+Up`, drag-to-snap), which never goes through the app.
 */
export class FakeWindowShell implements IWindowShell {
	public isSupported: boolean;
	public isMini = false;
	public alwaysOnTop = false;
	public maximized = false;
	public enterMiniPlayerCallCount = 0;
	public restoreMainWindowCallCount = 0;
	public isAlwaysOnTopCallCount = 0;
	public minimizeCallCount = 0;
	public toggleMaximizeCallCount = 0;
	public closeCallCount = 0;
	public isMaximizedCallCount = 0;
	public onMaximizedChangeCallCount = 0;
	public lastDimensions?: WindowDimensions;
	private maximizedListeners = new Set<(maximized: boolean) => void>();

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

	public async minimize(): Promise<void> {
		this.minimizeCallCount++;
	}

	public async toggleMaximize(): Promise<void> {
		this.toggleMaximizeCallCount++;
		this.setMaximized(!this.maximized);
	}

	public async close(): Promise<void> {
		this.closeCallCount++;
	}

	public async isMaximized(): Promise<boolean> {
		this.isMaximizedCallCount++;
		return this.maximized;
	}

	public async onMaximizedChange(handler: (maximized: boolean) => void): Promise<() => void> {
		this.onMaximizedChangeCallCount++;
		this.maximizedListeners.add(handler);

		return () => {
			this.maximizedListeners.delete(handler);
		};
	}

	/** Simulates a maximize/restore performed by the OS, outside the app's own controls. */
	public emitMaximizedChange(maximized: boolean): void {
		this.setMaximized(maximized);
	}

	private setMaximized(maximized: boolean): void {
		this.maximized = maximized;

		for (const listener of [...this.maximizedListeners]) {
			listener(maximized);
		}
	}

	/**
	 * Resets all internal state, call counters, and recorded dimensions.
	 */
	public reset(): void {
		this.isMini = false;
		this.alwaysOnTop = false;
		this.maximized = false;
		this.enterMiniPlayerCallCount = 0;
		this.restoreMainWindowCallCount = 0;
		this.isAlwaysOnTopCallCount = 0;
		this.minimizeCallCount = 0;
		this.toggleMaximizeCallCount = 0;
		this.closeCallCount = 0;
		this.isMaximizedCallCount = 0;
		this.onMaximizedChangeCallCount = 0;
		this.maximizedListeners.clear();
		this.lastDimensions = undefined;
	}
}
