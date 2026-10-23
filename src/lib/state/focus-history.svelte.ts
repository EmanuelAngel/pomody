import { SvelteDate } from 'svelte/reactivity';
import type { DomainEvent } from '../domain/events/block-completed.event';
import {
	createEntryFromEvent,
	type FocusHistoryEntry,
	type FocusHistoryTask
} from '../domain/history/focus-history-entry.entity';
import type { TimerMode } from '../domain/timer/timer-fsm';
import type { IFocusHistoryRepository } from '../domain/ports/focus-history-repository.port';
import { LocalFocusHistoryRepository } from '../adapters/storage/local-focus-history-repository';
import { migrateLegacyDailyStats } from '../adapters/storage/legacy-daily-stats-migration';
import { tasksState } from './tasks.svelte';
import { timerState } from './timer.svelte';

export interface FocusHistoryDependencies {
	repository?: IFocusHistoryRepository;
	timer?: { onEvent: (fn: (e: DomainEvent) => void) => () => void };
	tasks?: { readonly activeTask: FocusHistoryTask | null };
	nowProvider?: () => Date;
	/**
	 * One-shot startup task run on the serialized queue before the first load, so every event and the
	 * initial reload come after it. Absent in isolated instances: only the app singleton migrates.
	 */
	migrateLegacy?: (repository: IFocusHistoryRepository, nowProvider: () => Date) => Promise<void>;
}

/**
 * Reactive recorder of the focus history: turns every block the timer finishes — focus or break,
 * completed, skipped or abandoned — into one persisted entry, tagged with the task active at that moment.
 * Uses Svelte 5 Runes ($state) and connects to timer domain events.
 */
export class FocusHistoryState {
	private readonly repository: IFocusHistoryRepository;
	private readonly tasks: { readonly activeTask: FocusHistoryTask | null };
	private readonly nowProvider: () => Date;
	private _timerUnsubscribe?: () => void;
	private _externalUnsubscribe?: () => void;

	/** Serializes every repository operation so appends, reloads and clears never interleave. */
	private _queue: Promise<void> = Promise.resolve();
	/** The block that just completed, kept to recognise the skip a user can press right after it. */
	private _lastCompleted: { mode: TimerMode; round: number } | null = null;

	private _entries = $state<readonly FocusHistoryEntry[]>([]);

	public get entries(): readonly FocusHistoryEntry[] {
		return this._entries;
	}

	constructor(deps: FocusHistoryDependencies = {}) {
		this.nowProvider = deps.nowProvider ?? (() => new SvelteDate());
		this.repository =
			deps.repository ?? new LocalFocusHistoryRepository(undefined, this.nowProvider);
		this.tasks = deps.tasks ?? tasksState;
		const timer = deps.timer ?? timerState;

		const migrateLegacy = deps.migrateLegacy;
		if (migrateLegacy) {
			this.enqueue(() => migrateLegacy(this.repository, this.nowProvider));
		}
		this.enqueue(() => this.reload());
		this._timerUnsubscribe = timer.onEvent((event) => this.handleDomainEvent(event));
		this._externalUnsubscribe = this.repository.onExternalChange(() => {
			this.enqueue(() => this.reload());
		});
	}

	private enqueue(task: () => Promise<void>): void {
		this._queue = this._queue.then(task).catch((error) => {
			console.error('Focus history operation failed:', error);
		});
	}

	private async reload(): Promise<void> {
		this._entries = await this.repository.getAll();
	}

	/**
	 * Skip is reachable from the `completed` state and then reports the already finished block as
	 * skipped with its full duration. That block is already recorded as completed, so it is not recorded twice.
	 */
	private isSkipOfCompletedBlock(event: DomainEvent): boolean {
		return (
			event.type === 'block-skipped' &&
			this._lastCompleted !== null &&
			this._lastCompleted.mode === event.mode &&
			this._lastCompleted.round === event.round &&
			event.elapsedMs === event.durationMs
		);
	}

	private handleDomainEvent(event: DomainEvent): void {
		const ignore = this.isSkipOfCompletedBlock(event);
		this._lastCompleted =
			event.type === 'block-completed' ? { mode: event.mode, round: event.round } : null;
		if (ignore) {
			return;
		}

		const activeTask = this.tasks.activeTask;
		const entry = createEntryFromEvent(
			event,
			this.nowProvider(),
			activeTask ? { id: activeTask.id, title: activeTask.title } : null
		);
		if (entry === null) {
			return;
		}

		this.enqueue(async () => {
			await this.repository.append(entry);
			await this.reload();
		});
	}

	/**
	 * Deletes the whole history and empties the exposed entries.
	 */
	public async clear(): Promise<void> {
		this.enqueue(async () => {
			await this.repository.clearAll();
			this._entries = [];
		});
		await this._queue;
	}

	/**
	 * Resolves once every queued repository operation has finished.
	 */
	public whenIdle(): Promise<void> {
		return this._queue;
	}

	/**
	 * Unsubscribes from timer events and from storage changes made by other tabs.
	 */
	public destroy(): void {
		this._timerUnsubscribe?.();
		this._timerUnsubscribe = undefined;
		this._externalUnsubscribe?.();
		this._externalUnsubscribe = undefined;
	}
}

/**
 * Factory function to create isolated FocusHistoryState instances.
 */
export function createFocusHistoryState(deps?: FocusHistoryDependencies): FocusHistoryState {
	return new FocusHistoryState(deps);
}

/**
 * Global singleton recorder for the application.
 */
export const focusHistoryState = new FocusHistoryState({
	migrateLegacy: (repository, nowProvider) =>
		migrateLegacyDailyStats({ repository, now: nowProvider })
});

export default focusHistoryState;
