import {
	MAIN_WINDOW_DIMENSIONS,
	MAIN_WINDOW_MIN_DIMENSIONS,
	MINI_WINDOW_DIMENSIONS,
	MINI_WINDOW_MIN_DIMENSIONS,
	type IWindowShell,
	type WindowDimensions
} from '../../domain/ports/window-shell.port';

/**
 * Minimal structural mirror of the Tauri v2 window client surface used by this adapter.
 * Injecting it keeps `@tauri-apps/api` out of the static module graph, so the web bundle
 * and the Node test runner never evaluate the native module.
 */
export interface TauriWindowClientLike {
	setMinSize(dimensions: WindowDimensions): Promise<void>;
	setSize(dimensions: WindowDimensions): Promise<void>;
	setAlwaysOnTop(alwaysOnTop: boolean): Promise<void>;
	setDecorations(decorations: boolean): Promise<void>;
	setResizable(resizable: boolean): Promise<void>;
	center(): Promise<void>;
	isAlwaysOnTop(): Promise<boolean>;
	minimize(): Promise<void>;
	toggleMaximize(): Promise<void>;
	close(): Promise<void>;
	isMaximized(): Promise<boolean>;
	/** Subscribes to native resize events; resolves with the detach function. */
	onResized(handler: () => void): Promise<() => void>;
}

/**
 * Detects whether the current runtime is a Tauri shell.
 * Purely structural: reads `__TAURI_INTERNALS__` off `globalThis` without importing any native code.
 */
export function isTauriRuntimeAvailable(): boolean {
	return (
		typeof globalThis !== 'undefined' &&
		(globalThis as Record<string, unknown>)['__TAURI_INTERNALS__'] !== undefined
	);
}

/**
 * Lazily resolves the current Tauri window.
 * Returns `null` outside a Tauri runtime so callers degrade to the web behaviour.
 */
async function resolveTauriWindowClient(): Promise<TauriWindowClientLike | null> {
	if (!isTauriRuntimeAvailable()) {
		return null;
	}

	const { LogicalSize } = await import('@tauri-apps/api/dpi');
	const { getCurrentWindow } = await import('@tauri-apps/api/window');
	const current = getCurrentWindow();

	return {
		setMinSize: async (dimensions) => {
			await current.setMinSize(new LogicalSize(dimensions.width, dimensions.height));
		},
		setSize: async (dimensions) => {
			await current.setSize(new LogicalSize(dimensions.width, dimensions.height));
		},
		setAlwaysOnTop: async (alwaysOnTop) => {
			await current.setAlwaysOnTop(alwaysOnTop);
		},
		setDecorations: async (decorations) => {
			await current.setDecorations(decorations);
		},
		setResizable: async (resizable) => {
			await current.setResizable(resizable);
		},
		center: async () => {
			await current.center();
		},
		isAlwaysOnTop: async () => current.isAlwaysOnTop(),
		minimize: async () => {
			await current.minimize();
		},
		toggleMaximize: async () => {
			await current.toggleMaximize();
		},
		close: async () => {
			// `close` goes through the native close request, which the Rust side
			// intercepts (`prevent_close` + `hide`) to keep the tray icon alive.
			await current.close();
		},
		isMaximized: async () => current.isMaximized(),
		onResized: async (handler) => current.onResized(() => handler())
	};
}

/**
 * IWindowShell adapter backed by the Tauri v2 native window (Windows desktop).
 * The native client is reached through an injectable seam and resolved lazily,
 * so importing this module is safe in Node, SSR, and the web bundle.
 */
export class TauriWindowShell implements IWindowShell {
	private client: TauriWindowClientLike | null;
	private clientResolved: boolean;

	constructor(client?: TauriWindowClientLike | null) {
		this.client = client ?? null;
		this.clientResolved = client !== undefined;
	}

	/**
	 * Resolves the native client on first use.
	 * Returns `null` when no Tauri runtime is present, keeping the web build a safe no-op.
	 */
	private async getClient(): Promise<TauriWindowClientLike | null> {
		if (this.clientResolved) {
			return this.client;
		}

		this.client = await resolveTauriWindowClient();
		this.clientResolved = true;

		return this.client;
	}

	public get isSupported(): boolean {
		if (this.clientResolved) {
			return this.client !== null;
		}

		return isTauriRuntimeAvailable();
	}

	/**
	 * Makes the window frameless, non-resizable and 280x64, then pins it on top.
	 *
	 * Order matters: Tauri `setSize` sets the OUTER size. While decorations are
	 * off, outer equals inner, so the chrome must be configured BEFORE the resize —
	 * resizing first and stripping decorations afterwards would leave the window
	 * short by the height of a title bar it no longer has.
	 */
	public async enterMiniPlayer(
		dimensions: WindowDimensions = MINI_WINDOW_DIMENSIONS
	): Promise<void> {
		const client = await this.getClient();
		if (!client) return;

		await client.setDecorations(false);
		await client.setMinSize(MINI_WINDOW_MIN_DIMENSIONS);
		await client.setSize(dimensions);
		await client.setResizable(false);
		await client.setAlwaysOnTop(true);
	}

	/**
	 * Reverses {@link enterMiniPlayer}: unpins, re-enables resizing, resets the minimum
	 * size, resizes to the main dimensions, and finally re-centres the window.
	 *
	 * Decorations are deliberately NOT restored. The main window is frameless for good
	 * (`tauri.conf.json` `decorations: false`) and owns its title bar strip, so bringing the
	 * native bar back on exit would stack one chrome on top of the other. This is why the
	 * resize no longer has to happen after a `setDecorations(true)`.
	 *
	 * The re-centre is what `design.md` §4.2 specified all along ("vuelve a las
	 * dimensiones originales y posición centrada") and what the first
	 * implementation left out: the window used to keep whatever position the
	 * compact widget had been dragged to, which could sit partly off-screen.
	 *
	 * `center` runs LAST because it centres the CURRENT size. Centring before the
	 * final resize would centre the 320x48 compact box and then grow it from that
	 * origin, leaving the restored window off-centre.
	 */
	public async restoreMainWindow(): Promise<void> {
		const client = await this.getClient();
		if (!client) return;

		await client.setAlwaysOnTop(false);
		await client.setResizable(true);
		await client.setMinSize(MAIN_WINDOW_MIN_DIMENSIONS);
		await client.setSize(MAIN_WINDOW_DIMENSIONS);
		await client.center();
	}

	public async isAlwaysOnTop(): Promise<boolean> {
		const client = await this.getClient();
		if (!client) return false;

		return client.isAlwaysOnTop();
	}

	/** Sends the window to the taskbar. Also the Windows convention the tray left alone. */
	public async minimize(): Promise<void> {
		const client = await this.getClient();
		if (!client) return;

		await client.minimize();
	}

	/** Flips the window between maximized and restored in one native call. */
	public async toggleMaximize(): Promise<void> {
		const client = await this.getClient();
		if (!client) return;

		await client.toggleMaximize();
	}

	/**
	 * Asks the native window to close.
	 *
	 * The desktop shell intercepts the request with `prevent_close()` + `hide()`, so this
	 * hides to the tray and inherits that behaviour with no Rust involvement here.
	 */
	public async close(): Promise<void> {
		const client = await this.getClient();
		if (!client) return;

		await client.close();
	}

	public async isMaximized(): Promise<boolean> {
		const client = await this.getClient();
		if (!client) return false;

		return client.isMaximized();
	}

	/**
	 * Reports maximize/restore changes by watching the native resize event.
	 *
	 * Tauri v2 has no maximize event, and a maximize IS a resize, so every resize re-reads
	 * `isMaximized()` and only a state that differs from the last one is delivered. The last
	 * value is seeded at subscribe time: without that, the first resize after mounting would
	 * notify a state the caller already read, and any resize of a restored window would look
	 * like a change.
	 *
	 * Best effort by contract: a listener the platform refuses (a missing
	 * `core:event:allow-listen`, for instance) degrades to a no-op unsubscribe instead of
	 * rejecting into the caller's effect, and a state read that fails after a resize is
	 * dropped — that listener runs outside every caller's await chain, so throwing there
	 * would surface as an unhandled rejection.
	 */
	public async onMaximizedChange(handler: (maximized: boolean) => void): Promise<() => void> {
		const client = await this.getClient();
		if (!client) return () => {};

		let lastKnown = await client.isMaximized();

		try {
			return await client.onResized(async () => {
				let maximized: boolean;

				try {
					maximized = await client.isMaximized();
				} catch {
					return;
				}

				if (maximized === lastKnown) return;

				lastKnown = maximized;
				handler(maximized);
			});
		} catch {
			return () => {};
		}
	}
}
