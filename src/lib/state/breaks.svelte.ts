import { type BreakActivity, pickNextBreakActivity } from '../domain/breaks/break-activity.entity';
import {
	type IBreakActivityRepository,
	sortBreakActivities
} from '../domain/ports/break-activity-repository.port';
import { LocalStorageBreakActivityRepository } from '../adapters/storage/local-break-activity-repository';

/**
 * Reactive state store managing break activities with Svelte 5 Runes ($state, $derived).
 * Connects the pure domain BreakActivity entity operations with IBreakActivityRepository persistence.
 */
export class BreaksState {
	private readonly repository: IBreakActivityRepository;

	private _activities = $state<readonly BreakActivity[]>([]);
	private _activeActivity = $state<BreakActivity | null>(null);
	private _currentBreakCycle = $state<string | null>(null);
	private _isLoading = $state<boolean>(false);
	private _isLoaded = $state<boolean>(false);

	public readonly activities = $derived.by(() => this._activities);
	public readonly activeActivity = $derived.by(() => this._activeActivity);
	public readonly currentBreakCycle = $derived.by(() => this._currentBreakCycle);
	public readonly isLoading = $derived.by(() => this._isLoading);
	public readonly isLoaded = $derived.by(() => this._isLoaded);

	constructor(repository?: IBreakActivityRepository) {
		this.repository = repository ?? new LocalStorageBreakActivityRepository();
	}

	/**
	 * Loads break activities from the repository, stores sorted activities, and marks isLoaded = true.
	 */
	public async load(): Promise<void> {
		this._isLoading = true;
		try {
			const activities = await this.repository.getAll();
			this._activities = sortBreakActivities(activities);
			this._isLoaded = true;

			if (this._activeActivity) {
				const matched = this._activities.find((a) => a.id === this._activeActivity?.id);
				this._activeActivity = matched ?? null;
			}
		} finally {
			this._isLoading = false;
		}
	}

	/**
	 * Suggests a break activity for a specific break cycle key.
	 * If called consecutively with the same cycleKey and an active activity exists,
	 * returns the current active activity without changing (guarantees tab switch stability).
	 * Otherwise, updates currentBreakCycle, picks the next activity avoiding the previous one,
	 * sets activeActivity, and returns it.
	 */
	public suggestForBreak(cycleKey: string, maxDurationMinutes?: number): BreakActivity | null {
		if (this._currentBreakCycle === cycleKey && this._activeActivity !== null) {
			return this._activeActivity;
		}

		this._currentBreakCycle = cycleKey;
		const next = pickNextBreakActivity(
			this._activities,
			this._activeActivity?.id,
			maxDurationMinutes
		);
		this._activeActivity = next;
		return next;
	}

	/**
	 * Forces rotation to a different activity avoiding the current activeActivity id.
	 * Updates activeActivity and returns it.
	 */
	public shuffle(maxDurationMinutes?: number): BreakActivity | null {
		const next = pickNextBreakActivity(
			this._activities,
			this._activeActivity?.id,
			maxDurationMinutes
		);
		this._activeActivity = next;
		return next;
	}

	/**
	 * Resets the active break cycle marker to null.
	 */
	public resetCycle(): void {
		this._currentBreakCycle = null;
	}

	/**
	 * Persists a break activity via repository, updates the reactive activities list (sorted),
	 * and syncs activeActivity reference if the saved activity matches activeActivity.
	 */
	public async saveActivity(activity: BreakActivity): Promise<void> {
		await this.repository.save(activity);

		const existingIndex = this._activities.findIndex((a) => a.id === activity.id);
		let next: BreakActivity[];
		if (existingIndex >= 0) {
			next = [...this._activities];
			next[existingIndex] = activity;
		} else {
			next = [...this._activities, activity];
		}
		this._activities = sortBreakActivities(next);

		if (this._activeActivity?.id === activity.id) {
			this._activeActivity = activity;
		}
	}

	/**
	 * Deletes a custom break activity.
	 * Throws an Error if the target activity is a preset ('Cannot delete system preset break activity').
	 * Removes the activity from repository and reactive activities list.
	 * Resets activeActivity to null if it matches the deleted activity.
	 */
	public async deleteActivity(activityId: string): Promise<void> {
		let target = this._activities.find((a) => a.id === activityId);
		if (!target && !this._isLoaded) {
			const all = await this.repository.getAll();
			target = all.find((a) => a.id === activityId);
		}

		if (target?.isPreset) {
			throw new Error('Cannot delete system preset break activity');
		}

		await this.repository.delete(activityId);
		this._activities = this._activities.filter((a) => a.id !== activityId);

		if (this._activeActivity?.id === activityId) {
			this._activeActivity = null;
		}
	}

	/**
	 * Resets catalog back to default preset break activities via repository and reloads state.
	 * Resets activeActivity to null if it is no longer present in the reloaded catalog.
	 */
	public async resetToDefaults(): Promise<void> {
		await this.repository.resetToDefaults();
		await this.load();
	}
}

/**
 * Factory function to create isolated BreaksState instances (useful for testing or sub-contexts).
 */
export function createBreaksState(repository?: IBreakActivityRepository): BreaksState {
	return new BreaksState(repository);
}

/**
 * Global singleton reactive breaks state instance for the application.
 */
export const breaksState = new BreaksState();
