/**
 * Formats an elapsed duration as a wall-clock reading of how long ago something happened.
 *
 * Unlike `formatTime` (which rounds up, because it counts time remaining), this floors to
 * whole seconds: a pause or a finished block that just happened reads `00:00`, never `00:01`.
 * Past one hour it switches to `H:MM:SS` so a long absence never renders as `75:12`.
 */
export function formatElapsed(ms: number): string {
	const totalSeconds = Math.max(0, Math.floor(ms / 1000));
	const hours = Math.floor(totalSeconds / 3600);
	const minutes = Math.floor((totalSeconds % 3600) / 60);
	const seconds = totalSeconds % 60;
	const mm = String(minutes).padStart(2, '0');
	const ss = String(seconds).padStart(2, '0');

	return hours > 0 ? `${hours}:${mm}:${ss}` : `${mm}:${ss}`;
}
