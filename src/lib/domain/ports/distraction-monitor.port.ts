export interface OpenWindow {
	readonly exe: string;
	readonly title: string;
}

export interface WindowObservation extends OpenWindow {
	/** Seconds since the user's last input (machine-wide). */
	readonly idleSeconds: number;
}

/**
 * Read-only window observation port (spec §3.1). True only for adapters that can read
 * other processes' windows; the Web adapter reports `isSupported = false` and answers
 * `null` / `[]` without throwing. `listOpenWindows()` is an ephemeral UI read: its result
 * is never persisted or cached.
 */
export interface IDistractionMonitor {
	/** True only when the platform can read other processes' windows. */
	readonly isSupported: boolean;

	/** Foreground window, or `null` on Web. */
	getForegroundWindow(): Promise<WindowObservation | null>;

	/** Top-level windows with a title, for the declaration picker. */
	listOpenWindows(): Promise<readonly OpenWindow[]>;
}
