import type {
	DistractionAction,
	DistractionActionId,
	DistractionNotice,
	IDistractionNotifier
} from '../../domain/ports/distraction-notifier.port';
import { isTauriRuntimeAvailable } from '../window/tauri-window-shell';

/**
 * Identifier of the single action type this feature registers. Desktop resolves it to the
 * buttons of every notice that references it (`tauri-plugin-notification` ≥ 2.6.0).
 */
export const DISTRACTION_ACTION_TYPE_ID = 'pomodoro-distraction';

/** What this adapter hands the plugin to show. Only the fields the feature owns. */
export interface TauriNoticeOptions {
	readonly title: string;
	readonly body: string;
	readonly actionTypeId?: string;
	readonly extra?: Record<string, unknown>;
}

/** One action of a registered type, as the plugin declares it. */
export interface TauriActionTypeLike {
	readonly id: string;
	readonly actions: readonly { readonly id: string; readonly title: string }[];
}

/**
 * What the plugin reports when the user picks something on a notice. `actionId` is the
 * action's own id or `tap` for the notice itself; `notification` is null when the platform
 * does not report it.
 */
export interface TauriActionEventLike {
	readonly actionId: string;
	readonly notification: { readonly extra?: Record<string, unknown> } | null;
}

/**
 * Minimal structural mirror of the `@tauri-apps/plugin-notification` surface used by this
 * adapter. Injecting it keeps the native module out of the static module graph, so the web
 * bundle and the Node test runner never evaluate it (same seam as
 * `TauriDistractionMonitor`).
 */
export interface TauriNotificationClientLike {
	isPermissionGranted(): Promise<boolean>;
	requestPermission(): Promise<NotificationPermission>;
	sendNotification(notice: TauriNoticeOptions): void;
	registerActionTypes(types: readonly TauriActionTypeLike[]): Promise<void>;
	onAction(handler: (event: TauriActionEventLike) => void): Promise<{ unregister(): void }>;
}

/**
 * Lazily resolves the notification plugin.
 * Returns `null` outside a Tauri runtime so every call degrades to a safe no-op.
 */
async function resolveTauriNotificationClient(): Promise<TauriNotificationClientLike | null> {
	if (!isTauriRuntimeAvailable()) {
		return null;
	}

	const {
		isPermissionGranted,
		requestPermission,
		sendNotification,
		registerActionTypes,
		onAction
	} = await import('@tauri-apps/plugin-notification');

	return {
		isPermissionGranted: () => isPermissionGranted(),
		requestPermission: () => requestPermission(),
		sendNotification: (notice) => sendNotification(notice),
		registerActionTypes: (types) =>
			registerActionTypes(
				types.map((type) => ({
					id: type.id,
					actions: type.actions.map((action) => ({
						id: action.id,
						title: action.title
					}))
				}))
			),
		onAction: async (handler) => onAction((event) => handler(event))
	};
}

/** True only for the three ids this feature declares; `tap` and anything else are dropped. */
function isDistractionActionId(actionId: string): actionId is DistractionActionId {
	return actionId === 'ack' || actionId === 'silence_day' || actionId === 'silence_permanent';
}

/**
 * IDistractionNotifier adapter backed by `tauri-plugin-notification` (spec §5).
 *
 * On desktop 2.6.0 and newer the three actions of the notice resolve to buttons and their
 * activation comes back through `onAction`, so the toast can silence the rule it names
 * without the user ever leaving the window they were distracted by. On any platform that
 * cannot draw or report them, `supportsActions` is false and the notice stays the faro the
 * spec already documents (`decisions.md` §5.2).
 *
 * Every method resolves: a denied permission, a missing runtime or a failing toast backend
 * is a lost notice, never a rejection inside the poll loop.
 */
export class TauriDistractionNotifier implements IDistractionNotifier {
	private client: TauriNotificationClientLike | null;
	private clientResolved: boolean;
	/**
	 * True once the OS was asked for the permission. Asking is what makes a cold start work
	 * on Windows, and asking only once keeps it from turning into a dialog per notice.
	 */
	private permissionRequested = false;

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

	/** Desktop draws the buttons of a registered type; a resolved client is that desktop. */
	public get supportsActions(): boolean {
		return this.isSupported;
	}

	public async registerActions(actions: readonly DistractionAction[]): Promise<void> {
		try {
			const client = await this.getClient();
			if (!client) return;

			await client.registerActionTypes([
				{
					id: DISTRACTION_ACTION_TYPE_ID,
					actions: actions.map((action) => ({ id: action.id, title: action.title }))
				}
			]);
		} catch {
			// A notice without buttons is still a notice: the registration is best effort.
		}
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

	public async notify(notice: DistractionNotice): Promise<void> {
		try {
			const client = await this.getClient();
			if (!client) return;

			if (!(await this.ensurePermission(client))) {
				return;
			}

			client.sendNotification({
				title: notice.title,
				body: notice.body,
				actionTypeId: DISTRACTION_ACTION_TYPE_ID,
				extra: { ruleId: notice.ruleId }
			});
		} catch {
			// A lost notice must never break a focus block (spec §5).
		}
	}

	/**
	 * Subscribes to the registered actions.
	 *
	 * The listener is resolved asynchronously because the plugin's own subscription is a
	 * promise; unsubscribing before it lands still unregisters, so a state that tears down
	 * early leaks nothing. Anything the platform reports that is not one of the three ids,
	 * or that arrives without the rule it was about, is dropped rather than guessed.
	 */
	public onAction(handler: (actionId: DistractionActionId, ruleId: string) => void): () => void {
		let active = true;
		let unregister: (() => void) | null = null;

		void this.getClient()
			.then(async (client) => {
				if (!client || !active) return;

				const listener = await client.onAction((event) => {
					if (!isDistractionActionId(event.actionId)) return;

					const ruleId = event.notification?.extra?.ruleId;
					if (typeof ruleId !== 'string' || ruleId.length === 0) return;

					handler(event.actionId, ruleId);
				});

				if (!active) {
					listener.unregister();
					return;
				}

				unregister = () => listener.unregister();
			})
			.catch(() => {
				// Nothing to subscribe to: the notice has no actionable buttons here.
			});

		return () => {
			active = false;
			unregister?.();
			unregister = null;
		};
	}

	/**
	 * Resolves the permission, asking the OS at most once.
	 *
	 * On Windows the plugin's injected shim answers `false` on a cold start even when the
	 * user granted the permission in a previous session, so trusting that first answer is
	 * what left a switched-on detector silent (finding 1 of the verification of `6aeab5f`).
	 * Asking once is the fix, and asking only once keeps a genuinely denied permission from
	 * turning into a dialog on every notice.
	 */
	private async ensurePermission(client: TauriNotificationClientLike): Promise<boolean> {
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
