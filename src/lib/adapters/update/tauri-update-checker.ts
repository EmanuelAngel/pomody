import type { IUpdateChecker, UpdateInfo } from '../../domain/ports/update-checker.port';
import { isTauriRuntimeAvailable } from '../window/tauri-window-shell';

/**
 * Minimal structural mirror of the `Update` handle `@tauri-apps/plugin-updater` returns.
 * Only the fields this adapter reads, so a test double stays small.
 */
export interface TauriUpdateLike {
	readonly version: string;
	readonly body?: string;
	readonly date?: string;
	downloadAndInstall(): Promise<void>;
}

/**
 * Minimal structural mirror of the `@tauri-apps/plugin-updater` surface used by this
 * adapter. Injecting it keeps the native module out of the static module graph, so the web
 * bundle and the Node test runner never evaluate it (same seam as `TauriBlockNotifier`).
 */
export interface TauriUpdateClientLike {
	check(): Promise<TauriUpdateLike | null>;
}

/**
 * Lazily resolves the updater plugin.
 * Returns `null` outside a Tauri runtime so every call degrades to a safe no-op.
 */
async function resolveTauriUpdateClient(): Promise<TauriUpdateClientLike | null> {
	if (!isTauriRuntimeAvailable()) {
		return null;
	}

	const { check } = await import('@tauri-apps/plugin-updater');

	return {
		check: async () => {
			const update = await check();
			if (!update) {
				return null;
			}

			return {
				version: update.version,
				body: update.body,
				date: update.date,
				downloadAndInstall: () => update.downloadAndInstall()
			};
		}
	};
}

/**
 * IUpdateChecker adapter backed by `tauri-plugin-updater` (spec S2).
 *
 * The feed is the `latest.json` the release workflow uploads next to the installer, and the
 * plugin refuses any bundle whose signature does not match the public key in
 * `tauri.conf.json`. This adapter owns neither: it asks, remembers the answer, and installs
 * it on request.
 *
 * `check` and `installPending` reject on a real failure (network, signature) — the state
 * needs that to tell "up to date" from "could not check". Outside a Tauri runtime both
 * resolve without doing anything.
 */
export class TauriUpdateChecker implements IUpdateChecker {
	private client: TauriUpdateClientLike | null;
	private clientResolved: boolean;
	/** The update the last `check` found. Cleared whenever a later check finds none. */
	private pending: TauriUpdateLike | null = null;

	constructor(client?: TauriUpdateClientLike | null) {
		this.client = client ?? null;
		this.clientResolved = client !== undefined;
	}

	/**
	 * Resolves the native client on first use.
	 * Returns `null` when no Tauri runtime is present, keeping the web build a safe no-op.
	 */
	private async getClient(): Promise<TauriUpdateClientLike | null> {
		if (this.clientResolved) {
			return this.client;
		}

		this.client = await resolveTauriUpdateClient();
		this.clientResolved = true;

		return this.client;
	}

	public get isSupported(): boolean {
		if (this.clientResolved) {
			return this.client !== null;
		}

		return isTauriRuntimeAvailable();
	}

	public async check(): Promise<UpdateInfo | null> {
		const client = await this.getClient();
		if (!client) return null;

		const update = await client.check();
		this.pending = update;

		if (!update) return null;

		return {
			version: update.version,
			notes: update.body ?? null,
			publishedAt: update.date ?? null
		};
	}

	public async installPending(): Promise<void> {
		if (!this.pending) return;

		await this.pending.downloadAndInstall();
	}
}
