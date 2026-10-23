import { localDateKey, type FocusHistoryEntry } from './focus-history-entry.entity';

export interface DailyFocusSummary {
	readonly completedBlocks: number;
	readonly accumulatedMinutes: number;
}

const MS_PER_MINUTE = 60 * 1000;

/**
 * What the daily counter shows: the focus blocks completed on `dayKey` (`YYYY-MM-DD`), migrated ones
 * included. Partial blocks (skipped, abandoned) and breaks are stored but never counted.
 * Each block adds `Math.round(plannedMs / 60000)` minutes, the rounding the old counter used.
 */
export function summarizeDailyFocus(
	entries: readonly FocusHistoryEntry[],
	dayKey: string
): DailyFocusSummary {
	let completedBlocks = 0;
	let accumulatedMinutes = 0;

	for (const entry of entries) {
		if (entry.mode !== 'focus' || entry.outcome !== 'completed' || localDateKey(entry) !== dayKey) {
			continue;
		}
		completedBlocks += 1;
		accumulatedMinutes += Math.round(entry.plannedMs / MS_PER_MINUTE);
	}

	return { completedBlocks, accumulatedMinutes };
}
