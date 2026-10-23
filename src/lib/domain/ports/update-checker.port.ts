/**
 * A newer version of the application, as the user should be told about it.
 *
 * Notes arrive as the Markdown body of the release (the changelog release-please writes),
 * and the publication date as an RFC 3339 string. Either can be missing from the feed, so
 * both are nullable instead of defaulted: the presentation layer decides what to show.
 */
export interface UpdateInfo {
	readonly version: string;
	readonly notes: string | null;
	readonly publishedAt: string | null;
}

/**
 * Update channel of the desktop application (spec S2).
 *
 * Two steps on purpose: `check` only asks, `installPending` downloads and installs what the
 * last `check` found. The split is what lets the state refuse to install while a focus
 * block is in progress (spec S3), because installing on Windows quits the application.
 *
 * Failure contract: an unsupported platform resolves without throwing. A supported one
 * rejects when the feed cannot be reached or the download fails, so the state can tell
 * "no update" from "could not check".
 */
export interface IUpdateChecker {
	/** True only while the platform can update itself. */
	readonly isSupported: boolean;

	/** Asks the feed for a newer version. Resolves null when the app is up to date. */
	check(): Promise<UpdateInfo | null>;

	/**
	 * Downloads and installs the update found by the last `check`. Resolves without doing
	 * anything when there is none. On Windows the installer quits the application.
	 */
	installPending(): Promise<void>;
}
