import type { BlockNotice, IBlockNotifier } from '$lib/domain/ports/block-notifier.port';

/**
 * In-memory test fake implementing IBlockNotifier.
 *
 * Defaults to `isSupported = true` with the permission already granted, because it stands
 * in for the native backend: a test that needs the Web degradation instantiates it with
 * `{ isSupported: false }`, which is exactly what `NoopBlockNotifier` reports.
 *
 * `permissionGranted` stays mutable so a test can reproduce a first denial followed by a
 * grant, which is the sequence the switch has to survive.
 *
 * `notifyCalls` records the notices the state decided to show — the attempts, not what the
 * OS ended up drawing. Whether a denied permission suppresses the notice is the adapter's
 * contract and is covered by its own tests.
 */
export class FakeBlockNotifier implements IBlockNotifier {
	public readonly notifyCalls: BlockNotice[] = [];
	public requestPermissionCalls = 0;
	public permissionGranted: boolean;

	private readonly supported: boolean;

	constructor(options: { isSupported?: boolean; permissionGranted?: boolean } = {}) {
		this.supported = options.isSupported ?? true;
		this.permissionGranted = options.permissionGranted ?? true;
	}

	get isSupported(): boolean {
		return this.supported;
	}

	async requestPermission(): Promise<boolean> {
		this.requestPermissionCalls++;
		return this.permissionGranted;
	}

	async notify(notice: BlockNotice): Promise<void> {
		this.notifyCalls.push(notice);
	}
}
