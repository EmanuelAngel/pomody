import type { BlockNotice } from '$lib/domain/ports/block-notifier.port';
import type { BlockToast, BlockToastHandle } from '$lib/domain/ports/block-toast.port';

/**
 * In-memory test fake implementing BlockToast.
 *
 * `shown` records every notice the state decided to display and `dismissed` every handle it
 * took back, so a test can pin both halves of the policy: when the toast appears and when
 * it has to go away.
 */
export class FakeBlockToast implements BlockToast {
	public readonly shown: BlockNotice[] = [];
	public readonly dismissed: (string | number)[] = [];
	private nextId = 1;

	public show(notice: BlockNotice): BlockToastHandle {
		this.shown.push(notice);
		return { id: this.nextId++ };
	}

	public dismiss(handle: BlockToastHandle): void {
		this.dismissed.push(handle.id);
	}
}
