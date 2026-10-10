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
 * button row) with all four controls revealed at once. See
 * `docs/features/mini-player/decisions.md`.
 */
export const MINI_WINDOW_DIMENSIONS: WindowDimensions = Object.freeze({
	width: 320,
	height: 64
});

/**
 * Minimum size allowed while the compact Mini-Player mode is active.
 * Must be applied BEFORE any `setSize` call below {@link MINI_WINDOW_DIMENSIONS},
 * otherwise the native `minWidth`/`minHeight` constraints clamp the resize.
 */
export const MINI_WINDOW_MIN_DIMENSIONS: WindowDimensions = Object.freeze({
	width: 200,
	height: 50
});

/**
 * Domain port for native window manipulation (resize, pin on top).
 * Zero dependencies on DOM, Svelte, or Tauri.
 *
 * Ordering invariants every adapter MUST honour:
 * - `enterMiniPlayer` lowers the native minimum size to {@link MINI_WINDOW_MIN_DIMENSIONS}
 *   BEFORE resizing to the requested dimensions, and only then enables always-on-top.
 * - `restoreMainWindow` disables always-on-top, resets the minimum size to
 *   {@link MAIN_WINDOW_MIN_DIMENSIONS}, and only then resizes to {@link MAIN_WINDOW_DIMENSIONS}.
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
}
