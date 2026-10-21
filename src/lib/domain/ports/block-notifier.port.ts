/**
 * A finished block, as the OS should announce it.
 *
 * The title names the phase that ended and the body names the one the timer will start
 * next. Both strings are built by the presentation layer, so this port never sees a
 * locale, a timer snapshot or a mode: it is handed finished copy and shows it.
 */
export interface BlockNotice {
	readonly title: string;
	readonly body: string;
}

/**
 * OS notice channel of the block-end notifier (spec S3).
 *
 * Best effort by contract, exactly like `IDistractionNotifier`: an unsupported platform, a
 * denied permission or a failing backend resolves without throwing. A lost notice must
 * never break the end of a block, and it must never surface as an unhandled rejection.
 */
export interface IBlockNotifier {
	/** True only while the platform can show OS notifications. */
	readonly isSupported: boolean;

	/** Asks the OS for the notification permission. Resolves true when it is granted. */
	requestPermission(): Promise<boolean>;

	/** Shows the notice. Resolves once the backend was asked, never with a rejection. */
	notify(notice: BlockNotice): Promise<void>;
}
