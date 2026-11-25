/**
 * Formats an instant as the reading of a wall clock: 24-hour, zero-padded `HH:MM`.
 *
 * Seconds are dropped, so a minute reads the same for its whole 60 seconds: with a per-second
 * label right next to it, a ticking end time would look like the block keeps moving its finish
 * line. Spelled `HH:MM` here, unlike `formatElapsed` (a duration), because this is a clock reading.
 */
export function formatClockTime(timestamp: number): string {
	const date = new Date(timestamp);
	const hours = String(date.getHours()).padStart(2, '0');
	const minutes = String(date.getMinutes()).padStart(2, '0');

	return `${hours}:${minutes}`;
}

/**
 * Projects the instant a block ends at, from the current instant and the time it has left.
 *
 * A block with 40 minutes left at 15:00 ends at 15:40. While the timer is paused the remaining time
 * does not move, so the projection slides with the wall clock — which is the point: a ten minute
 * pause pushes the end ten minutes later. A block that already ran out clamps to `now`, so it can
 * never project a finish in the past.
 */
export function projectBlockEnd(now: number, remainingMs: number): number {
	return now + Math.max(0, remainingMs);
}
