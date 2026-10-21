import type { TimerSnapshotRecord } from '../timer/timer-snapshot.entity';

/**
 * Domain port defining persistence for the timer execution snapshot.
 * Follows Hexagonal Architecture: pure TypeScript, zero dependencies on DOM, Svelte, or Tauri.
 *
 * A missing or corrupt record must resolve to `null`; the caller owns the recovery policy.
 */
export interface ITimerStateRepository {
	/**
	 * Retrieves the last persisted timer snapshot.
	 * Returns `null` when nothing is stored, storage is unsupported, or the record is invalid.
	 */
	load(): Promise<TimerSnapshotRecord | null>;

	/**
	 * Persists the given snapshot as the current timer state.
	 */
	save(snapshot: TimerSnapshotRecord): Promise<void>;

	/**
	 * Clears the persisted timer snapshot.
	 */
	clear(): Promise<void>;
}
