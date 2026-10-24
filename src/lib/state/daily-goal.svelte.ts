import { SvelteDate } from 'svelte/reactivity';
import {
	applyGoalChange,
	goalForDate,
	validateDailyGoalChange,
	type DailyGoalChange,
	type DailyGoalValidationError
} from '../domain/goals/daily-goal.entity';
import { getLocalDateString } from '../domain/history/local-date';
import type { IDailyGoalRepository } from '../domain/ports/daily-goal-repository.port';
import { LocalDailyGoalRepository } from '../adapters/storage/local-daily-goal-repository';

export interface DailyGoalDependencies {
	repository?: IDailyGoalRepository;
	nowProvider?: () => Date;
}

export type DailyGoalMutationResult =
	| { readonly ok: true; readonly change: DailyGoalChange }
	| { readonly ok: false; readonly reason: DailyGoalValidationError };

/**
 * Reactive state of the daily goal: the list of goal changes with their effective date, and the
 * goal in force today. Editing the goal always starts today and never rewrites an earlier day.
 * Uses Svelte 5 Runes ($state, $derived).
 */
export class DailyGoalState {
	private readonly repository: IDailyGoalRepository;
	private readonly nowProvider: () => Date;
	private _externalUnsubscribe?: () => void;

	/** Serializes every repository operation so writes and reloads never interleave. */
	private _queue: Promise<void> = Promise.resolve();

	private _history = $state<readonly DailyGoalChange[]>([]);

	/** Bumped by `checkRollover` to make `currentGoal` read the clock again. */
	private _clockReads = $state<number>(0);

	private readonly _currentGoal = $derived.by(() => {
		void this._clockReads;
		return goalForDate(this._history, getLocalDateString(this.nowProvider()));
	});

	public get history(): readonly DailyGoalChange[] {
		return this._history;
	}

	/**
	 * The goal in force today, or null when none is configured (or it was removed). There is no
	 * default: a null goal is the "configure it" state, not a zero goal.
	 */
	public get currentGoal(): DailyGoalChange | null {
		return this._currentGoal;
	}

	constructor(deps: DailyGoalDependencies = {}) {
		this.nowProvider = deps.nowProvider ?? (() => new SvelteDate());
		this.repository = deps.repository ?? new LocalDailyGoalRepository();

		this.enqueue(() => this.reload());
		this._externalUnsubscribe = this.repository.onExternalChange(() => {
			this.enqueue(() => this.reload());
		});
	}

	private enqueue(task: () => Promise<void>): void {
		this._queue = this._queue.then(task).catch((error) => {
			console.error('Daily goal operation failed:', error);
		});
	}

	private async reload(): Promise<void> {
		this._history = await this.repository.getHistory();
	}

	/**
	 * Sets the goal from today on. `minutes = 0` removes it from today. A second edit on the same
	 * day replaces the first; earlier days keep the goal they had. Rejected goals are never written.
	 */
	public async setGoal(
		minutes: number,
		restWeekdays: readonly number[]
	): Promise<DailyGoalMutationResult> {
		const validation = validateDailyGoalChange({
			effectiveFrom: getLocalDateString(this.nowProvider()),
			minutes,
			restWeekdays
		});
		if (!validation.ok) {
			return { ok: false, reason: validation.reason };
		}

		const change = validation.change;
		this._history = applyGoalChange(this._history, change);
		this.enqueue(async () => {
			await this.repository.applyChange(change);
			await this.reload();
		});
		await this._queue;

		return { ok: true, change };
	}

	/**
	 * Re-reads the clock so `currentGoal` follows the calendar day. Nothing is written.
	 */
	public checkRollover(): void {
		this._clockReads += 1;
	}

	/**
	 * Resolves once every queued repository operation has finished.
	 */
	public whenIdle(): Promise<void> {
		return this._queue;
	}

	/**
	 * Unsubscribes from storage changes made by other tabs.
	 */
	public destroy(): void {
		this._externalUnsubscribe?.();
		this._externalUnsubscribe = undefined;
	}
}

/**
 * Factory function to create isolated DailyGoalState instances.
 */
export function createDailyGoalState(deps?: DailyGoalDependencies): DailyGoalState {
	return new DailyGoalState(deps);
}

/**
 * Global singleton reactive daily goal state for the application.
 */
export const dailyGoalState = new DailyGoalState();

export default dailyGoalState;
