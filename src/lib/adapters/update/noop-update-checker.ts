import type { IUpdateChecker, UpdateInfo } from '../../domain/ports/update-checker.port';

/**
 * IUpdateChecker adapter for the web build (spec S9).
 *
 * A browser tab is always served the latest build, so there is nothing to update. This
 * adapter keeps the composition root whole — the state asks, gets "no update", and nothing
 * throws.
 */
export class NoopUpdateChecker implements IUpdateChecker {
	/** The web platform has no update channel. */
	public readonly isSupported = false;

	public async check(): Promise<UpdateInfo | null> {
		return null;
	}

	public async installPending(): Promise<void> {}
}
