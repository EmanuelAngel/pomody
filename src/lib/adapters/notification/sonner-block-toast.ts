import { toast } from 'svelte-sonner';
import type { BlockNotice } from '../../domain/ports/block-notifier.port';
import type { BlockToast, BlockToastHandle } from '../../domain/ports/block-toast.port';

/**
 * BlockToast backed by `svelte-sonner`, the toast the shadcn-svelte registry installs.
 *
 * `duration: Infinity` is load-bearing: the notice is born while the user is not looking,
 * so an auto-dismissed toast would delete the record before they come back. The state
 * dismisses it when the next block starts, when the timer resets or is skipped, or when
 * the user closes it.
 *
 * The title is the toast's headline and the body its description: the same two strings the
 * OS notice shows, so both channels read as the same announcement.
 */
export class SonnerBlockToast implements BlockToast {
	public show(notice: BlockNotice): BlockToastHandle {
		const id = toast(notice.title, {
			description: notice.body,
			duration: Infinity
		});

		return { id };
	}

	public dismiss(handle: BlockToastHandle): void {
		toast.dismiss(handle.id);
	}
}
