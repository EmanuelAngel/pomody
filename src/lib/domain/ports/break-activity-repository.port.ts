import type { BreakActivity, BreakCategory } from '../breaks/break-activity.entity';

/**
 * Pure comparison function for ordering break activities deterministically.
 * Orders primarily by `category` ascending (`localeCompare`),
 * then `title` ascending (`localeCompare`),
 * breaking ties by `id` ascending (`localeCompare`).
 */
export function compareBreakActivities(a: BreakActivity, b: BreakActivity): number {
	const categoryComparison = a.category.localeCompare(b.category);
	if (categoryComparison !== 0) {
		return categoryComparison;
	}

	const titleComparison = a.title.localeCompare(b.title);
	if (titleComparison !== 0) {
		return titleComparison;
	}

	return a.id.localeCompare(b.id);
}

/**
 * Returns a new frozen array containing the given break activities sorted deterministically
 * by category ascending, then title ascending, then id ascending.
 */
export function sortBreakActivities(
	activities: readonly BreakActivity[]
): readonly BreakActivity[] {
	return Object.freeze([...activities].sort(compareBreakActivities));
}

/**
 * Domain port defining persistence and catalog operations for break activities.
 * Zero dependencies on DOM, Svelte, or storage implementations.
 */
export interface IBreakActivityRepository {
	/**
	 * Retrieves all break activities sorted deterministically by category, title, then id.
	 */
	getAll(): Promise<readonly BreakActivity[]>;

	/**
	 * Retrieves break activities belonging to a specific category, sorted deterministically.
	 */
	getByCategory(category: BreakCategory): Promise<readonly BreakActivity[]>;

	/**
	 * Upserts a single break activity.
	 */
	save(activity: BreakActivity): Promise<void>;

	/**
	 * Deletes a break activity by its identifier.
	 */
	delete(activityId: string): Promise<void>;

	/**
	 * Resets catalog back to the default preset activities.
	 */
	resetToDefaults(): Promise<void>;

	/**
	 * Purges all break activities without touching other storage keys.
	 */
	clearAll(): Promise<void>;
}
