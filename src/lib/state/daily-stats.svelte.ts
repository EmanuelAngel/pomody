import { SvelteDate } from 'svelte/reactivity';
import { summarizeDailyFocus } from '../domain/history/daily-focus-summary';
import type { FocusHistoryEntry } from '../domain/history/focus-history-entry.entity';
import { getLocalDateString } from '../domain/history/local-date';
import { focusHistoryState } from './focus-history.svelte';

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

/** What the daily counter needs from the focus history: the loaded entries, reactively. */
export interface DailyStatsHistorySource {
	readonly entries: readonly FocusHistoryEntry[];
}

/**
 * Reactive Daily Focus Counter, derived from the focus history: nothing is stored for it.
 * Counts today's completed focus blocks (migrated ones included) and sums their minutes.
 * "Today" is a filter, so the day rollover writes nothing.
 */
export class DailyStatsState {
	private readonly history: DailyStatsHistorySource;
	private readonly nowProvider: () => Date;
	/** The day `date` last reported, kept outside the reactive graph to tell what `checkRollover` changed. */
	private lastDate: string;

	/** Bumped by `checkRollover` to make `date` read the clock again. */
	private _clockReads = $state<number>(0);

	/**
	 * Today's local date. It reads the clock whenever the history changes (a block ended, another
	 * tab wrote, the history was cleared) or `checkRollover` asks; there is no midnight scheduler.
	 */
	private readonly _date = $derived.by(() => {
		void this._clockReads;
		void this.history.entries;
		this.lastDate = getLocalDateString(this.nowProvider());
		return this.lastDate;
	});

	private readonly _summary = $derived.by(() =>
		summarizeDailyFocus(this.history.entries, this._date)
	);

	public get completedBlocks(): number {
		return this._summary.completedBlocks;
	}

	public get accumulatedMinutes(): number {
		return this._summary.accumulatedMinutes;
	}

	public get date(): string {
		return this._date;
	}

	public readonly formattedSummary = $derived.by(() => {
		return formatDailyStatsSummary(this.completedBlocks, this.accumulatedMinutes);
	});

	constructor(
		history: DailyStatsHistorySource = focusHistoryState,
		nowProvider: () => Date = () => new SvelteDate()
	) {
		this.history = history;
		this.nowProvider = nowProvider;
		this.lastDate = getLocalDateString(nowProvider());
	}

	/**
	 * Re-reads the clock. Returns true when the calendar day changed since the last read, in which
	 * case the counter now shows the new day. Nothing is written or deleted.
	 */
	public checkRollover(): boolean {
		const before = this.lastDate;
		this._clockReads += 1;
		return this._date !== before;
	}
}

/**
 * Factory function to create isolated DailyStatsState instances.
 */
export function createDailyStatsState(
	history?: DailyStatsHistorySource,
	nowProvider?: () => Date
): DailyStatsState {
	return new DailyStatsState(history, nowProvider);
}

/**
 * Global singleton reactive daily stats instance for the application.
 */
export const dailyStatsState = new DailyStatsState();

export default dailyStatsState;
