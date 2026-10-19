import type {
	DistractionAction,
	DistractionActionId,
	DistractionNotice,
	IDistractionNotifier
} from '$lib/domain/ports/distraction-notifier.port';

/**
 * In-memory test fake implementing IDistractionNotifier.
 *
 * Defaults to `isSupported = true` with the permission already granted, because it stands
 * in for the native backend: a test that needs the Web degradation instantiates it with
 * `{ isSupported: false }`, which is exactly what `NoopDistractionNotifier` reports.
 *
 * `notifyCalls` records the notices the detector decided to show — the attempts, not what
 * the OS ended up drawing. Whether a denied permission suppresses the notice is the
 * adapter's contract and is covered by its own tests.
 */
export class FakeDistractionNotifier implements IDistractionNotifier {
	public readonly notifyCalls: DistractionNotice[] = [];
	public readonly registerActionsCalls: (readonly DistractionAction[])[] = [];
	public requestPermissionCalls = 0;
	public permissionGranted: boolean;

	private readonly supported: boolean;
	private readonly actionsSupported: boolean;
	private readonly grantOnRequest: boolean;
	private handlers: ((actionId: DistractionActionId, ruleId: string) => void)[] = [];

	constructor(
		options: { isSupported?: boolean; supportsActions?: boolean; permissionGranted?: boolean } = {}
	) {
		this.supported = options.isSupported ?? true;
		this.actionsSupported = options.supportsActions ?? this.supported;
		this.permissionGranted = options.permissionGranted ?? true;
		this.grantOnRequest = options.permissionGranted ?? true;
	}

	get isSupported(): boolean {
		return this.supported;
	}

	get supportsActions(): boolean {
		return this.actionsSupported;
	}

	async registerActions(actions: readonly DistractionAction[]): Promise<void> {
		this.registerActionsCalls.push([...actions]);
	}

	async requestPermission(): Promise<boolean> {
		this.requestPermissionCalls++;
		this.permissionGranted = this.grantOnRequest;
		return this.permissionGranted;
	}

	async notify(notice: DistractionNotice): Promise<void> {
		this.notifyCalls.push(notice);
	}

	onAction(handler: (actionId: DistractionActionId, ruleId: string) => void): () => void {
		this.handlers.push(handler);

		return () => {
			this.handlers = this.handlers.filter((current) => current !== handler);
		};
	}

	/** Simulates the user picking one of the buttons of the notice. */
	public emitAction(actionId: DistractionActionId, ruleId: string): void {
		for (const handler of [...this.handlers]) {
			handler(actionId, ruleId);
		}
	}

	/** Number of live subscriptions, so a test can pin that nothing is left attached. */
	public get actionHandlerCount(): number {
		return this.handlers.length;
	}
}
