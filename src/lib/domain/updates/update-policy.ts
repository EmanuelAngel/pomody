import type { TimerState } from '../timer/timer-fsm';

/** How often the application asks for a newer version while it stays open (spec S4). */
export const UPDATE_CHECK_INTERVAL_MS = 6 * 60 * 60 * 1000;

/**
 * Whether installing now would cut a block short (spec S3).
 *
 * Installing quits the application on Windows, so a block in progress — running or
 * paused, focus or break alike — must never be interrupted. `idle` and `completed`
 * have nothing to lose.
 */
export function isUpdateInstallBlocked(timerState: TimerState): boolean {
	return timerState === 'running' || timerState === 'paused';
}
