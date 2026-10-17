import { normalizeExe } from '../../domain/distraction/distraction-rule.entity';
import type {
	IDistractionMonitor,
	OpenWindow,
	WindowObservation
} from '../../domain/ports/distraction-monitor.port';
import { isTauriRuntimeAvailable } from './tauri-window-shell';

/**
 * Minimal structural mirror of the Tauri v2 `invoke` surface used by this adapter.
 * Injecting it keeps `@tauri-apps/api` out of the static module graph, so the web bundle
 * and the Node test runner never evaluate the native module.
 */
export interface TauriInvokeClientLike {
	invoke(command: string): Promise<unknown>;
}

/** Command names of the native bridge, as registered in `src-tauri/src/lib.rs` (spec §8). */
const ACTIVE_WINDOW_COMMAND = 'active_window';
const OPEN_WINDOWS_COMMAND = 'open_windows';

/** Wire shape of the Rust `WindowInfo` (`#[serde(rename_all = "camelCase")]`). */
interface WindowInfoWire {
	readonly exe: string;
	readonly title: string;
	readonly idleSeconds: number;
}

/**
 * Lazily resolves the Tauri IPC client.
 * Returns `null` outside a Tauri runtime so callers degrade to the no-op behaviour.
 */
async function resolveTauriInvokeClient(): Promise<TauriInvokeClientLike | null> {
	if (!isTauriRuntimeAvailable()) {
		return null;
	}

	const { invoke } = await import('@tauri-apps/api/core');

	return { invoke: (command) => invoke(command) };
}

/**
 * Narrows one raw IPC payload, in the same spirit as the `sanitize*` validators of the
 * local repositories: an unexpected shape is dropped instead of reaching the domain.
 *
 * The rules deliberately mirror the native side of the bridge (spec §8) — an unreadable
 * executable, an untitled window or an impossible idle time must never become a rule —
 * and an idle time that is absent or not a non-negative number is dropped rather than
 * defaulted to `0`, because `0` would silently disarm the idle guard of the policy
 * (spec §3.4) and produce the avalanche the guard exists to prevent.
 *
 * `exe` is normalized here, with the domain's `normalizeExe`: Rust only reports what the
 * OS says, the executable key that rules and the picker compare is a domain concept.
 */
function parseWindowInfo(raw: unknown): WindowObservation | null {
	if (typeof raw !== 'object' || raw === null) {
		return null;
	}

	const { exe, title, idleSeconds } = raw as Partial<Record<keyof WindowInfoWire, unknown>>;

	if (typeof exe !== 'string' || typeof title !== 'string' || title.trim().length === 0) {
		return null;
	}

	if (typeof idleSeconds !== 'number' || !Number.isFinite(idleSeconds) || idleSeconds < 0) {
		return null;
	}

	const normalizedExe = normalizeExe(exe);
	if (normalizedExe.length === 0) {
		return null;
	}

	return { exe: normalizedExe, title, idleSeconds };
}

/**
 * IDistractionMonitor adapter backed by the native Windows bridge (`active_window` and
 * `open_windows`, spec §8). The native client is reached through an injectable seam and
 * resolved lazily, so importing this module is safe in Node, SSR, and the web bundle.
 *
 * Every reading is ephemeral: nothing is cached, nothing is persisted (spec §2 P2).
 */
export class TauriDistractionMonitor implements IDistractionMonitor {
	private client: TauriInvokeClientLike | null;
	private clientResolved: boolean;

	constructor(client?: TauriInvokeClientLike | null) {
		this.client = client ?? null;
		this.clientResolved = client !== undefined;
	}

	/**
	 * Resolves the native client on first use.
	 * Returns `null` when no Tauri runtime is present, keeping the web build a safe no-op.
	 */
	private async getClient(): Promise<TauriInvokeClientLike | null> {
		if (this.clientResolved) {
			return this.client;
		}

		this.client = await resolveTauriInvokeClient();
		this.clientResolved = true;

		return this.client;
	}

	public get isSupported(): boolean {
		if (this.clientResolved) {
			return this.client !== null;
		}

		return isTauriRuntimeAvailable();
	}

	public async getForegroundWindow(): Promise<WindowObservation | null> {
		const client = await this.getClient();
		if (!client) return null;

		return parseWindowInfo(await client.invoke(ACTIVE_WINDOW_COMMAND));
	}

	public async listOpenWindows(): Promise<readonly OpenWindow[]> {
		const client = await this.getClient();
		if (!client) return [];

		const raw = await client.invoke(OPEN_WINDOWS_COMMAND);
		if (!Array.isArray(raw)) return [];

		return raw
			.map((entry) => parseWindowInfo(entry))
			.filter((entry): entry is WindowObservation => entry !== null)
			.map((entry) => ({ exe: entry.exe, title: entry.title }));
	}
}
