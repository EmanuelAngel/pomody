import type { BlockNotice } from './block-notifier.port';

/** Opaque reference to a toast already on screen. */
export interface BlockToastHandle {
	readonly id: string | number;
}

/**
 * In-app notice channel of the block-end notifier (spec S3).
 *
 * It carries the same copy as the OS channel and exists for the moment the user comes
 * back: the OS notice may already be gone, the toast stays until the next block starts.
 * Best effort by contract, like the OS channel: showing is fire-and-forget.
 */
export interface BlockToast {
	/** Shows the notice and returns the handle that dismisses this exact one. */
	show(notice: BlockNotice): BlockToastHandle;

	/** Removes a notice that is still on screen. A stale handle is a no-op, never a throw. */
	dismiss(handle: BlockToastHandle): void;
}
