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

/**
 * Whether enough time has passed since the last check to ask again.
 * A clock that moved backwards counts as due: the stored instant can no longer be trusted.
 */
export function shouldCheckForUpdate(lastCheckedAt: number | null, now: number): boolean {
	if (lastCheckedAt === null) {
		return true;
	}

	const elapsed = now - lastCheckedAt;

	return elapsed < 0 || elapsed >= UPDATE_CHECK_INTERVAL_MS;
}
