import { SvelteDate } from 'svelte/reactivity';
import type { DomainEvent } from '../domain/events/block-completed.event';
import {
	activityFromTimerEvent,
	createActivityEntry,
	type ActivityDetails,
	type ActivityKind,
	type ActivityLogEntry
} from '../domain/activity/activity-log-entry.entity';
import type { IActivityLogRepository } from '../domain/ports/activity-log-repository.port';
import { LocalActivityLogRepository } from '../adapters/storage/local-activity-log-repository';
import { timerState } from './timer.svelte';
import { tasksState } from './tasks.svelte';
import { planningState } from './planning.svelte';
import { dailyGoalState } from './daily-goal.svelte';
import { appBootstrap } from './app-bootstrap.svelte';

export interface ActivityLogDependencies {
	repository?: IActivityLogRepository;
	timer?: { onEvent: (fn: (e: DomainEvent) => void) => () => void };
	nowProvider?: () => Date;
}

/**
 * Reactive recorder of the activity trace shown in Metrics › History. Timer actions arrive as
 * domain events; planning, tasks, the daily goal and the restore call `record` directly.
 * Kept apart from the focus history so the statistics never count these entries.
 */
export class ActivityLogState {
	private readonly repository: IActivityLogRepository;
	private readonly nowProvider: () => Date;
	private _timerUnsubscribe?: () => void;
	private _externalUnsubscribe?: () => void;
	private _queue: Promise<void> = Promise.resolve();
	private _entries = $state<readonly ActivityLogEntry[]>([]);
	private _isLoaded = $state<boolean>(false);

	public get entries(): readonly ActivityLogEntry[] {
		return this._entries;
	}

	public get isLoaded(): boolean {
		return this._isLoaded;
	}

	constructor(deps: ActivityLogDependencies = {}) {
		this.nowProvider = deps.nowProvider ?? (() => new SvelteDate());
		this.repository =
			deps.repository ?? new LocalActivityLogRepository(undefined, this.nowProvider);
		const timer = deps.timer ?? timerState;

		this.enqueue(() => this.reload());
		this._timerUnsubscribe = timer.onEvent((event) => this.handleTimerEvent(event));
		this._externalUnsubscribe = this.repository.onExternalChange(() => {
			this.enqueue(() => this.reload());
		});
	}

	private enqueue(task: () => Promise<void>): void {
		this._queue = this._queue.then(task).catch((error) => {
			console.error('Activity log operation failed:', error);
		});
	}

	private async reload(): Promise<void> {
		this._entries = await this.repository.getAll();
		this._isLoaded = true;
	}

	private handleTimerEvent(event: DomainEvent): void {
		// Only a block that already ran to the end skips with its full duration elapsed: the skip
		// that leaves it (even after a restore) is not a second outcome.
		if (event.type === 'block-skipped' && event.elapsedMs >= event.durationMs) {
			return;
		}

		const { kind, details } = activityFromTimerEvent(event);
		this.record(kind, details);
	}

	/** Appends one action stamped with the current instant. */
	public record(kind: ActivityKind, details?: ActivityDetails): void {
		const entry = createActivityEntry(kind, this.nowProvider(), details);
		if (entry === null) return;
		this.enqueue(async () => {
			await this.repository.append(entry);
			await this.reload();
		});
	}

	public whenIdle(): Promise<void> {
		return this._queue;
	}

	public destroy(): void {
		this._timerUnsubscribe?.();
		this._timerUnsubscribe = undefined;
		this._externalUnsubscribe?.();
		this._externalUnsubscribe = undefined;
	}
}

export function createActivityLogState(deps?: ActivityLogDependencies): ActivityLogState {
	return new ActivityLogState(deps);
}

export const activityLogState = new ActivityLogState();

tasksState.activity = activityLogState;
planningState.activity = activityLogState;
dailyGoalState.activity = activityLogState;
appBootstrap.activity = activityLogState;

export default activityLogState;
