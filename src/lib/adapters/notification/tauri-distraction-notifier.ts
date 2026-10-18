import type {
	DistractionNotice,
	IDistractionNotifier
} from '../../domain/ports/distraction-notifier.port';
import { isTauriRuntimeAvailable } from '../window/tauri-window-shell';

/**
 * Minimal structural mirror of the `@tauri-apps/plugin-notification` surface used by this
 * adapter. Injecting it keeps the native module out of the static module graph, so the web
 * bundle and the Node test runner never evaluate it (same seam as
 * `TauriDistractionMonitor`).
 */
export interface TauriNotificationClientLike {
	isPermissionGranted(): Promise<boolean>;
	requestPermission(): Promise<NotificationPermission>;
	sendNotification(notice: { title: string; body: string }): void;
}

/**
 * Lazily resolves the notification plugin.
 * Returns `null` outside a Tauri runtime so every call degrades to a safe no-op.
 */
async function resolveTauriNotificationClient(): Promise<TauriNotificationClientLike | null> {
	if (!isTauriRuntimeAvailable()) {
		return null;
	}

	const { isPermissionGranted, requestPermission, sendNotification } =
		await import('@tauri-apps/plugin-notification');

	return {
		isPermissionGranted: () => isPermissionGranted(),
		requestPermission: () => requestPermission(),
		sendNotification: (notice) => sendNotification(notice)
	};
}

/**
 * IDistractionNotifier adapter backed by `tauri-plugin-notification` (spec §5).
 *
 * The version this repo can take is pinned by the Tauri family, and on Windows it has no
 * action API at all: the notice is shown as a faro (title + body) and the classification
 * gestures live in the view. That is the degradation the spec documents, measured in
 * `docs/features/distraction-detector/decisions.md` §5.2 — not a bug of this adapter.
 *
 * Every method resolves: a denied permission, a missing runtime or a failing toast backend
 * is a lost notice, never a rejection inside the poll loop.
 */
export class TauriDistractionNotifier implements IDistractionNotifier {
	private client: TauriNotificationClientLike | null;
	private clientResolved: boolean;

	constructor(client?: TauriNotificationClientLike | null) {
		this.client = client ?? null;
		this.clientResolved = client !== undefined;
	}

	/**
	 * Resolves the native client on first use.
	 * Returns `null` when no Tauri runtime is present, keeping the web build a safe no-op.
	 */
	private async getClient(): Promise<TauriNotificationClientLike | null> {
		if (this.clientResolved) {
			return this.client;
		}

		this.client = await resolveTauriNotificationClient();
		this.clientResolved = true;

		return this.client;
	}

	public get isSupported(): boolean {
		if (this.clientResolved) {
			return this.client !== null;
		}

		return isTauriRuntimeAvailable();
	}

	public async requestPermission(): Promise<boolean> {
		try {
			const client = await this.getClient();
			if (!client) return false;

			if (await client.isPermissionGranted()) {
				return true;
			}

			return (await client.requestPermission()) === 'granted';
		} catch {
			return false;
		}
	}

	public async notify(notice: DistractionNotice): Promise<void> {
		try {
			const client = await this.getClient();
			if (!client) return;

			if (!(await client.isPermissionGranted())) {
				return;
			}

			client.sendNotification({ title: notice.title, body: notice.body });
		} catch {
			// A lost notice must never break a focus block (spec §5).
		}
	}
}
