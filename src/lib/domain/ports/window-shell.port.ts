/**
 * Pure TypeScript dimension contract for native window manipulation.
 * Values are logical pixels.
 */
export interface WindowDimensions {
	readonly width: number;
	readonly height: number;
}

/** Default size of the main application window. Mirrors `tauri.conf.json` width/height. */
export const MAIN_WINDOW_DIMENSIONS: WindowDimensions = Object.freeze({
	width: 800,
	height: 650
});

/** Minimum size enforced while the main window layout is active. Mirrors `tauri.conf.json` minWidth/minHeight. */
export const MAIN_WINDOW_MIN_DIMENSIONS: WindowDimensions = Object.freeze({
	width: 480,
	height: 500
});

/**
 * Default size requested when entering the compact Mini-Player mode.
 *
 * Sized for the 3-column topology (status icon + active task, centred timer, anchored
 * button row) with all four controls revealed at once, and with the content filling
 * the height instead of floating in dead space. The window is deliberately short:
 * the content is 24px and the progress-bar strip takes 8px, so 48px leaves 8px of
 * breathing room above and below. See `docs/features/mini-player/decisions.md`.
 */
export const MINI_WINDOW_DIMENSIONS: WindowDimensions = Object.freeze({
	width: 320,
	height: 48
});

/**
 * Minimum size allowed while the compact Mini-Player mode is active.
 * Must be applied BEFORE any `setSize` call below {@link MINI_WINDOW_DIMENSIONS},
 * otherwise the native `minWidth`/`minHeight` constraints clamp the resize.
 *
 * The height MUST stay below {@link MINI_WINDOW_DIMENSIONS}. Windows silently clamps
 * the requested size to the minimum, so a minimum taller than the target would leave
 * the widget a couple of pixels too tall with no error reported anywhere.
 */
export const MINI_WINDOW_MIN_DIMENSIONS: WindowDimensions = Object.freeze({
	width: 200,
	height: 40
});

/**
 * Domain port for native window manipulation (resize, pin on top, window controls).
 * Zero dependencies on DOM, Svelte, or Tauri.
 *
 * Ordering invariants every adapter MUST honour:
 * - `enterMiniPlayer` lowers the native minimum size to {@link MINI_WINDOW_MIN_DIMENSIONS}
 *   BEFORE resizing to the requested dimensions, and only then enables always-on-top.
 * - `restoreMainWindow` disables always-on-top, resets the minimum size to
 *   {@link MAIN_WINDOW_MIN_DIMENSIONS}, and only then resizes to {@link MAIN_WINDOW_DIMENSIONS}.
 * - Neither mini-player transition may bring the native decorations back: the main window is
 *   frameless for good and its own title bar strip is the only chrome it has.
 */
export interface IWindowShell {
	/** Whether the current platform supports native window manipulation. */
	readonly isSupported: boolean;

	/**
	 * Enters compact mode by lowering the native minimum size, resizing the window,
	 * and enabling always-on-top.
	 * @param dimensions Requested Mini-Player size (defaults to {@link MINI_WINDOW_DIMENSIONS}).
	 */
	enterMiniPlayer(dimensions?: WindowDimensions): Promise<void>;

	/**
	 * Restores the main window to {@link MAIN_WINDOW_DIMENSIONS} with a minimum size of
	 * {@link MAIN_WINDOW_MIN_DIMENSIONS} and disables always-on-top.
	 */
	restoreMainWindow(): Promise<void>;

	/** Queries whether the window is currently pinned on top of other windows. */
	isAlwaysOnTop(): Promise<boolean>;

	/**
	 * Sends the window to the taskbar.
	 *
	 * Not the tray: `minimize` follows the Windows convention the tray deliberately left
	 * alone (`docs/features/tray/decisions.md` §3), so an unsupported platform resolves
	 * without acting.
	 */
	minimize(): Promise<void>;

	/**
	 * Toggles between maximized and restored.
	 *
	 * One operation instead of a `maximize()`/`unmaximize()` pair because both the strip
	 * button and the strip double-click only ever ask "flip whatever the window is now",
	 * and the OS already owns the answer.
	 */
	toggleMaximize(): Promise<void>;

	/**
	 * Requests a close of the window.
	 *
	 * On the desktop the Rust side intercepts the request (`prevent_close` + `hide`), so
	 * this hides to the tray instead of terminating the app. That behaviour lives in the
	 * native shell and is inherited, never reimplemented here.
	 */
	close(): Promise<void>;

	/** Queries whether the window is currently maximized. */
	isMaximized(): Promise<boolean>;

	/**
	 * Subscribes to maximize/restore changes, including the ones the OS performs on its own
	 * (`Win+Up`, drag-to-snap).
	 *
	 * Every platform reports a maximize as a size change rather than a dedicated event, so
	 * implementations debounce repeated reports of the same state and deliver only real
	 * changes. Resolves with the unsubscribe, which is safe to call more than once and is a
	 * no-op on platforms without native windows.
	 */
	onMaximizedChange(handler: (maximized: boolean) => void): Promise<() => void>;
}
