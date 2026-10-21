import type { BlockNotice, IBlockNotifier } from '../../domain/ports/block-notifier.port';
import { isTauriRuntimeAvailable } from '../window/tauri-window-shell';

/** What this adapter hands the plugin to show. Only the fields the feature owns. */
export interface TauriBlockNoticeOptions {
	readonly title: string;
	readonly body: string;
}

/**
 * What the plugin reports when the user taps a notice. On desktop a click arrives with
 * `actionId === 'tap'`; this feature registers no other action.
 */
export interface TauriTapEventLike {
	readonly actionId: string;
}

/**
 * Minimal structural mirror of the `@tauri-apps/plugin-notification` surface used by this
 * adapter. Injecting it keeps the native module out of the static module graph, so the web
 * bundle and the Node test runner never evaluate it (same seam as
 * `TauriDistractionNotifier`).
 */
export interface TauriBlockNotificationClientLike {
	isPermissionGranted(): Promise<boolean>;
	requestPermission(): Promise<NotificationPermission>;
	sendNotification(notice: TauriBlockNoticeOptions): void;
	onAction(handler: (event: TauriTapEventLike) => void): Promise<{ unregister(): void }>;
}

/**
 * Lazily resolves the notification plugin.
 * Returns `null` outside a Tauri runtime so every call degrades to a safe no-op.
 */
async function resolveTauriNotificationClient(): Promise<TauriBlockNotificationClientLike | null> {
	if (!isTauriRuntimeAvailable()) {
		return null;
	}

	const { isPermissionGranted, requestPermission, sendNotification, onAction } =
		await import('@tauri-apps/plugin-notification');

	return {
		isPermissionGranted: () => isPermissionGranted(),
		requestPermission: () => requestPermission(),
		sendNotification: (notice) => sendNotification(notice),
		onAction: async (handler) => onAction((event) => handler(event))
	};
}

/**
 * Brings Pomody forward when the user taps the notice: a notice is a pointer back to the
 * app, and the window it names is the one the user just left.
 */
async function focusPomodyWindow(): Promise<void> {
	if (!isTauriRuntimeAvailable()) {
		return;
	}

	const { getCurrentWindow } = await import('@tauri-apps/api/window');
	await getCurrentWindow().setFocus();
}

/**
 * IBlockNotifier adapter backed by `tauri-plugin-notification` (spec S3).
 *
 * Desktop shows the notice through the OS, so it reaches the user while Pomody is behind
 * another window. A tap focuses the window again; the plugin documents that on Windows a
 * click is only reported while the toast is on screen, which is recorded as a degradation
 * (`docs/features/block-notifications/decisions.md`).
 *
 * Every method resolves: a denied permission, a missing runtime or a failing toast backend
 * is a lost notice, never a rejection that could reach the timer.
 */
export class TauriBlockNotifier implements IBlockNotifier {
	private client: TauriBlockNotificationClientLike | null;
	private clientResolved: boolean;
	/**
	 * True once the OS was asked for the permission. Asking is what makes a cold start work
	 * on Windows; asking only once keeps it from turning into a dialog per notice.
	 */
	private permissionRequested = false;
	/** True once the tap listener is attached. The plugin only reports taps while it exists. */
	private tapArmed = false;
	private readonly focusWindow: () => Promise<void> | void;

	constructor(
		client?: TauriBlockNotificationClientLike | null,
		focusWindow?: () => Promise<void> | void
	) {
		this.client = client ?? null;
		this.clientResolved = client !== undefined;
		this.focusWindow = focusWindow ?? focusPomodyWindow;
	}

	/**
	 * Resolves the native client on first use.
	 * Returns `null` when no Tauri runtime is present, keeping the web build a safe no-op.
	 */
	private async getClient(): Promise<TauriBlockNotificationClientLike | null> {
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

			return await this.ensurePermission(client);
		} catch {
			return false;
		}
	}

	public async notify(notice: BlockNotice): Promise<void> {
		try {
			const client = await this.getClient();
			if (!client) return;

			if (!(await this.ensurePermission(client))) {
				return;
			}

			await this.armTap(client);

			client.sendNotification({ title: notice.title, body: notice.body });
		} catch {
			// A lost notice must never break the end of a block (spec S3).
		}
	}

	/**
	 * Attaches the tap listener once, before the first notice is shown.
	 *
	 * A registration that fails (a platform without the action API) leaves the notice as a
	 * plain one: it is still the faro that tells the user the block ended.
	 */
	private async armTap(client: TauriBlockNotificationClientLike): Promise<void> {
		if (this.tapArmed) {
			return;
		}

		this.tapArmed = true;

		try {
			await client.onAction((event) => {
				if (event.actionId !== 'tap') {
					return;
				}

				void this.activate();
			});
		} catch {
			this.tapArmed = false;
		}
	}

	/** A window that is already gone cannot be focused; that is not an error worth surfacing. */
	private async activate(): Promise<void> {
		try {
			await this.focusWindow();
		} catch {
			// The notice already did its job by telling the user the block ended.
		}
	}

	/**
	 * Resolves the permission, asking the OS at most once.
	 *
	 * On Windows the plugin's injected shim answers `false` on a cold start even when the
	 * user granted the permission in a previous session, so asking once is what turns that
	 * first answer into a working notice. Asking only once keeps a genuinely denied
	 * permission from turning into a dialog on every block end.
	 */
	private async ensurePermission(client: TauriBlockNotificationClientLike): Promise<boolean> {
		if (await client.isPermissionGranted()) {
			return true;
		}

		if (this.permissionRequested) {
			return false;
		}

		this.permissionRequested = true;

		return (await client.requestPermission()) === 'granted';
	}
}
