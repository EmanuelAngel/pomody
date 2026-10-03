import { SvelteDate } from 'svelte/reactivity';
import type { DomainEvent } from '../domain/events/block-completed.event';
import type { IDailyStatsRepository } from '../domain/ports/daily-stats-repository.port';
import {
	LocalDailyStatsRepository,
	getLocalDateString
} from '../adapters/storage/local-daily-stats-repository';
import { timerState } from './timer.svelte';

/**
 * Formats accumulated focus minutes into a concise, human-readable format.
 * - < 60m: `${minutes}m` (e.g. 0m, 50m)
 * - >= 60m: `${Math.floor(minutes / 60)}h ${minutes % 60}m` (e.g. 60m -> 1h 0m, 100m -> 1h 40m)
 */
export function formatDailyDuration(minutes: number): string {
	const safeMinutes = Math.max(0, Math.floor(Number.isFinite(minutes) ? minutes : 0));
	if (safeMinutes < 60) {
		return `${safeMinutes}m`;
	}
	const hours = Math.floor(safeMinutes / 60);
	const mins = safeMinutes % 60;
	return `${hours}h ${mins}m`;
}

/**
 * Formats daily focus statistics into a Zen statusline string.
 * - If completedBlocks === 0: `0 blocks · 0m`
 * - If completedBlocks > 0: `${completedBlocks} ${completedBlocks === 1 ? 'block' : 'blocks'} · ${formattedDuration}`
 */
export function formatDailyStatsSummary(
	completedBlocks: number,
	accumulatedMinutes: number
): string {
	const safeBlocks = Math.max(
		0,
		Math.floor(Number.isFinite(completedBlocks) ? completedBlocks : 0)
	);
	if (safeBlocks === 0) {
		return '0 blocks · 0m';
	}
	const blockLabel = safeBlocks === 1 ? 'block' : 'blocks';
	const durationLabel = formatDailyDuration(accumulatedMinutes);
	return `${safeBlocks} ${blockLabel} · ${durationLabel}`;
}

/**
 * Reactive state store managing Daily Focus Counter statistics.
 * Uses Svelte 5 Runes ($state, $derived) and connects to timer domain events.
 */
export class DailyStatsState {
	private readonly repository: IDailyStatsRepository;
	private readonly timer?: { onEvent: (fn: (e: DomainEvent) => void) => () => void };
	private readonly nowProvider: () => Date;
	private _timerUnsubscribe?: () => void;

	private _completedBlocks = $state<number>(0);
	private _accumulatedMinutes = $state<number>(0);
	private _date = $state<string>('');

	public get completedBlocks(): number {
		return this._completedBlocks;
	}

	public get accumulatedMinutes(): number {
		return this._accumulatedMinutes;
	}

	public get date(): string {
		return this._date;
	}

	public readonly formattedSummary = $derived.by(() => {
		return formatDailyStatsSummary(this._completedBlocks, this._accumulatedMinutes);
	});

	constructor(
		repository?: IDailyStatsRepository,
		timer: { onEvent: (fn: (e: DomainEvent) => void) => () => void } | null = timerState,
		nowProvider: () => Date = () => new SvelteDate()
	) {
		this.nowProvider = nowProvider;
		this.repository = repository ?? new LocalDailyStatsRepository(undefined, nowProvider);
		this.timer = timer ?? undefined;

		this.loadInitialStats();

		if (this.timer) {
			this._timerUnsubscribe = this.timer.onEvent((event) => {
				this.handleDomainEvent(event);
			});
		}
	}

	private loadInitialStats(): void {
		const today = getLocalDateString(this.nowProvider());
		const loaded = this.repository.loadStats();
		if (loaded.date === today) {
			this._date = loaded.date;
			this._completedBlocks = loaded.completedBlocks;
			this._accumulatedMinutes = loaded.accumulatedMinutes;
		} else {
			this._date = today;
			this._completedBlocks = 0;
			this._accumulatedMinutes = 0;
		}
	}

	/**
	 * Checks if the calendar date has rolled over.
	 * If date changed, resets state to 0 for today, persists to repository, and returns true.
	 */
	public checkRollover(): boolean {
		const today = getLocalDateString(this.nowProvider());
		if (this._date !== today) {
			this._date = today;
			this._completedBlocks = 0;
			this._accumulatedMinutes = 0;
			this.repository.saveStats({
				date: today,
				completedBlocks: 0,
				accumulatedMinutes: 0
			});
			return true;
		}
		return false;
	}

	/**
	 * Handles timer domain events.
	 * Increments blocks and minutes only on focus block completion.
	 */
	private handleDomainEvent(event: DomainEvent): void {
		if (event.type === 'block-completed' && event.mode === 'focus') {
			this.checkRollover();

			this._completedBlocks += 1;
			const durationMs =
				typeof event.durationMs === 'number' && Number.isFinite(event.durationMs)
					? event.durationMs
					: 0;
			this._accumulatedMinutes += Math.round(durationMs / 60000);

			this.repository.saveStats({
				date: this._date,
				completedBlocks: this._completedBlocks,
				accumulatedMinutes: this._accumulatedMinutes
			});
		}
	}

	/**
	 * Resets daily statistics for today to zero and persists to repository.
	 */
	public reset(): void {
		const today = getLocalDateString(this.nowProvider());
		this._date = today;
		this._completedBlocks = 0;
		this._accumulatedMinutes = 0;
		this.repository.resetStats();
	}

	/**
	 * Unsubscribes from timer domain events.
	 */
	public destroy(): void {
		if (this._timerUnsubscribe) {
			this._timerUnsubscribe();
			this._timerUnsubscribe = undefined;
		}
	}
}

/**
 * Factory function to create isolated DailyStatsState instances.
 */
export function createDailyStatsState(
	repository?: IDailyStatsRepository,
	timer?: { onEvent: (fn: (e: DomainEvent) => void) => () => void } | null,
	nowProvider?: () => Date
): DailyStatsState {
	return new DailyStatsState(repository, timer, nowProvider);
}

/**
 * Global singleton reactive daily stats instance for the application.
 */
export const dailyStatsState = new DailyStatsState();

export default dailyStatsState;
