import type { FocusTask } from '../tasks/task.entity';

/**
 * Pure comparison function for ordering focus tasks deterministically.
 * Orders primarily by `order` ascending, breaking ties by `createdAt` ascending.
 */
export function compareFocusTasks(a: FocusTask, b: FocusTask): number {
	if (a.order !== b.order) {
		return a.order - b.order;
	}
	return a.createdAt - b.createdAt;
}

/**
 * Returns a new frozen array containing the given focus tasks sorted deterministically
 * by `order` ascending, then `createdAt` ascending.
 */
export function sortFocusTasks(tasks: readonly FocusTask[]): readonly FocusTask[] {
	return Object.freeze([...tasks].sort(compareFocusTasks));
}

/**
 * Domain port defining persistence operations for focus tasks.
 * Zero dependencies on DOM, Svelte, or storage implementations.
 */
export interface ITaskRepository {
	/**
	 * Retrieves all tasks ordered deterministically by order ascending, then createdAt ascending.
	 */
	getAll(): Promise<readonly FocusTask[]>;

	/**
	 * Retrieves pending (uncompleted) tasks ordered deterministically by order ascending, then createdAt ascending.
	 */
	getPending(): Promise<readonly FocusTask[]>;

	/**
	 * Upserts a single task.
	 */
	save(task: FocusTask): Promise<void>;

	/**
	 * Upserts a batch of tasks.
	 */
	saveBatch(tasks: readonly FocusTask[]): Promise<void>;

	/**
	 * Deletes a task by id.
	 */
	delete(taskId: string): Promise<void>;

	/**
	 * Removes all completed tasks.
	 */
	clearCompleted(): Promise<void>;

	/**
	 * Purges all tasks without touching other storage keys.
	 */
	clearAll(): Promise<void>;
}
