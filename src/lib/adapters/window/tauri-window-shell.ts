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
	 * Lowers the native minimum size, resizes to the requested dimensions,
	 * and only then pins the window on top.
	 */
	public async enterMiniPlayer(
		dimensions: WindowDimensions = MINI_WINDOW_DIMENSIONS
	): Promise<void> {
		const client = await this.getClient();
		if (!client) return;

		await client.setMinSize(MINI_WINDOW_MIN_DIMENSIONS);
		await client.setSize(dimensions);
		await client.setAlwaysOnTop(true);
	}

	/**
	 * Unpins the window, restores the main minimum size, and resizes back to the main dimensions.
	 */
	public async restoreMainWindow(): Promise<void> {
		const client = await this.getClient();
		if (!client) return;

		await client.setAlwaysOnTop(false);
		await client.setMinSize(MAIN_WINDOW_MIN_DIMENSIONS);
		await client.setSize(MAIN_WINDOW_DIMENSIONS);
	}

	public async isAlwaysOnTop(): Promise<boolean> {
		const client = await this.getClient();
		if (!client) return false;

		return client.isAlwaysOnTop();
	}
}
