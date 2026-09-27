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
