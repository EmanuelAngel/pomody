import type { FocusHistoryEntry } from '../history/focus-history-entry.entity';

/**
 * Domain port defining persistence operations for the focus history.
 * Async like `ITaskRepository` so the backing store can move to IndexedDB without touching consumers.
 * Zero dependencies on DOM, Svelte, or storage implementations.
 */
export interface IFocusHistoryRepository {
	/**
	 * Retrieves every stored entry in chronological order (`endedAt` ascending).
	 */
	getAll(): Promise<readonly FocusHistoryEntry[]>;

	/**
	 * Adds one entry on top of what is currently stored, trimming what falls outside the retention window.
	 */
	append(entry: FocusHistoryEntry): Promise<void>;

	/**
	 * Purges the whole history without touching other storage keys.
	 */
	clearAll(): Promise<void>;

	/**
	 * Notifies when another context (e.g. another tab) changed the stored history.
	 * Returns an unsubscribe function.
	 */
	onExternalChange(listener: () => void): () => void;
}
