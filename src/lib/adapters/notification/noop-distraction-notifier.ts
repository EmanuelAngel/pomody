import type {
	DistractionAction,
	DistractionActionId,
	DistractionNotice,
	IDistractionNotifier
} from '../../domain/ports/distraction-notifier.port';

/**
 * IDistractionNotifier adapter for the web build (spec §1).
 *
 * A browser cannot show an OS notification that outlives the page, and the detector does
 * not exist on the web anyway: the UI gates on the monitor's `isSupported` and hides
 * itself. This adapter keeps the composition root whole — the state asks, gets a polite
 * no, and nothing throws.
 */
export class NoopDistractionNotifier implements IDistractionNotifier {
	/** The web platform has no OS notification channel for this feature. */
	public readonly isSupported = false;

	/** Nor any way to draw or report the notice's actions. */
	public readonly supportsActions = false;

	public async registerActions(actions: readonly DistractionAction[]): Promise<void> {
		// Kept in the signature so this adapter mirrors the port exactly; discarded on purpose.
		void actions;
	}

	public async requestPermission(): Promise<boolean> {
		return false;
	}

	/** The notice is accepted and dropped: there is no channel to show it on. */
	public async notify(notice: DistractionNotice): Promise<void> {
		void notice;
	}

	/** Nothing can be picked on a notice that is never drawn. */
	public onAction(handler?: (actionId: DistractionActionId, ruleId: string) => void): () => void {
		void handler;
		return () => {
			// Nothing was ever subscribed.
		};
	}
}
