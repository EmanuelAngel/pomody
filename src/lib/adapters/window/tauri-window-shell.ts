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
	isAlwaysOnTop(): Promise<boolean>;
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
		isAlwaysOnTop: async () => current.isAlwaysOnTop()
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
	 * Reverses {@link enterMiniPlayer}: unpins, re-enables resizing, restores the
	 * frame, then resizes to the main dimensions.
	 *
	 * Decorations are restored BEFORE the resize for the same reason they are
	 * removed before it — resizing while frameless would make the requested outer
	 * size absorb the title bar that Windows adds back moments later.
	 */
	public async restoreMainWindow(): Promise<void> {
		const client = await this.getClient();
		if (!client) return;

		await client.setAlwaysOnTop(false);
		await client.setResizable(true);
		await client.setMinSize(MAIN_WINDOW_MIN_DIMENSIONS);
		await client.setDecorations(true);
		await client.setSize(MAIN_WINDOW_DIMENSIONS);
	}

	public async isAlwaysOnTop(): Promise<boolean> {
		const client = await this.getClient();
		if (!client) return false;

		return client.isAlwaysOnTop();
	}
}
