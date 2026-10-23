import type { IUpdateChecker, UpdateInfo } from '$lib/domain/ports/update-checker.port';

/**
 * In-memory test fake implementing IUpdateChecker.
 *
 * Defaults to `isSupported = true` because it stands in for the native updater: a test
 * that needs the Web degradation instantiates it with `{ isSupported: false }`, which is
 * exactly what `NoopUpdateChecker` reports.
 *
 * `nextCheck` is what the following `check` resolves, or rejects when it is an `Error`.
 * `holdCheck` parks the next `check` until `releaseCheck` is called, so a test can observe
 * the state while a request is in flight.
 */
export class FakeUpdateChecker implements IUpdateChecker {
	public checkCalls = 0;
	public installCalls = 0;
	public nextCheck: UpdateInfo | Error | null = null;
	public nextInstall: Error | null = null;

	private readonly supported: boolean;
	private release: (() => void) | null = null;
	private gate: Promise<void> | null = null;

	constructor(options: { isSupported?: boolean } = {}) {
		this.supported = options.isSupported ?? true;
	}

	get isSupported(): boolean {
		return this.supported;
	}

	holdCheck(): void {
		this.gate = new Promise<void>((resolve) => {
			this.release = resolve;
		});
	}

	releaseCheck(): void {
		this.release?.();
		this.release = null;
		this.gate = null;
	}

	async check(): Promise<UpdateInfo | null> {
		this.checkCalls++;
		await this.gate;

		if (this.nextCheck instanceof Error) {
			throw this.nextCheck;
		}

		return this.nextCheck;
	}

	async installPending(): Promise<void> {
		this.installCalls++;

		if (this.nextInstall) {
			throw this.nextInstall;
		}
	}
}
