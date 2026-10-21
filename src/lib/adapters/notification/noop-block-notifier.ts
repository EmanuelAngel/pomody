import type { BlockNotice, IBlockNotifier } from '../../domain/ports/block-notifier.port';

/**
 * IBlockNotifier adapter for the web build (spec S3).
 *
 * A browser cannot show an OS notification without asking the user for a permission the
 * feature deliberately does not request, so the web keeps the in-app toast as its only
 * channel. This adapter keeps the composition root whole — the state asks, gets a polite
 * no, and nothing throws.
 */
export class NoopBlockNotifier implements IBlockNotifier {
	/** The web platform has no OS notification channel for this feature. */
	public readonly isSupported = false;

	public async requestPermission(): Promise<boolean> {
		return false;
	}

	/** The notice is accepted and dropped: there is no channel to show it on. */
	public async notify(notice: BlockNotice): Promise<void> {
		void notice;
	}
}
