import type { DailyGoalChange } from '../goals/daily-goal.entity';

/**
 * Domain port defining persistence operations for the daily goal history.
 * Async like `ITaskRepository` so the backing store can move to IndexedDB without touching consumers.
 * Zero dependencies on DOM, Svelte, or storage implementations.
 */
export interface IDailyGoalRepository {
	/**
	 * Retrieves every stored goal change sorted by effective date, one entry per day.
	 * Returns an empty list when nothing is stored, storage is unsupported, or the payload is invalid.
	 */
	getHistory(): Promise<readonly DailyGoalChange[]>;

	/**
	 * Applies one change on top of what is currently stored: a change for a day that already has an
	 * entry replaces it, any other entry is kept untouched. An invalid change is not written.
	 */
	applyChange(change: DailyGoalChange): Promise<void>;

	/**
	 * Notifies when another context (e.g. another tab) changed the stored goal history.
	 * Returns an unsubscribe function.
	 */
	onExternalChange(listener: () => void): () => void;
}
