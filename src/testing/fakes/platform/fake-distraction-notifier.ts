import type {
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
	public requestPermissionCalls = 0;
	public permissionGranted: boolean;

	private readonly supported: boolean;
	private readonly grantOnRequest: boolean;

	constructor(options: { isSupported?: boolean; permissionGranted?: boolean } = {}) {
		this.supported = options.isSupported ?? true;
		this.permissionGranted = options.permissionGranted ?? true;
		this.grantOnRequest = options.permissionGranted ?? true;
	}

	get isSupported(): boolean {
		return this.supported;
	}

	async requestPermission(): Promise<boolean> {
		this.requestPermissionCalls++;
		this.permissionGranted = this.grantOnRequest;
		return this.permissionGranted;
	}

	async notify(notice: DistractionNotice): Promise<void> {
		this.notifyCalls.push(notice);
	}
}
