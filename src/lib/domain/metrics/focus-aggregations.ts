import { completedFocusMinutes, isCompletedFocus } from '$lib/domain/history/daily-focus-summary';
import {
	localDateKey,
	localHour,
	type FocusHistoryEntry
} from '$lib/domain/history/focus-history-entry.entity';
import { addDaysToKey, weekDayKeys, weekStartKey } from './date-key';

export const HOURLY_PATTERN_DAYS = 30;
const HOURS_PER_DAY = 24;

export interface DayFocus {
	/** Local day, `YYYY-MM-DD`. */
	readonly dateKey: string;
	readonly minutes: number;
	readonly blocks: number;
}

export interface FocusCompliance {
	readonly completed: number;
	readonly started: number;
	/** `completed / started`, or null when no focus block was started in the range. */
	readonly ratio: number | null;
}

/**
 * Completed focus minutes and blocks per local day of the week that contains `weekStart`
 * (normalised to its Monday), Monday to Sunday. Migrated entries count; breaks and partial blocks
 * never do. Minutes use the footer counter's rounding.
 */
export function weeklyFocusMinutes(
	entries: readonly FocusHistoryEntry[],
	weekStart: string
): DayFocus[] {
	const days = weekDayKeys(weekStart).map((dateKey) => ({ dateKey, minutes: 0, blocks: 0 }));
	const byKey = new Map(days.map((day) => [day.dateKey, day]));

	for (const entry of entries) {
		if (!isCompletedFocus(entry)) {
			continue;
		}
		const day = byKey.get(localDateKey(entry));
		if (day !== undefined) {
			day.minutes += completedFocusMinutes(entry);
			day.blocks += 1;
		}
	}

	return days;
}

/** Total completed focus minutes of a week, as returned by `weeklyFocusMinutes`. */
export function weekTotal(days: readonly DayFocus[]): { minutes: number; blocks: number } {
	return days.reduce(
		(total, day) => ({ minutes: total.minutes + day.minutes, blocks: total.blocks + day.blocks }),
		{ minutes: 0, blocks: 0 }
	);
}

/**
 * Completed focus minutes per local hour (24 buckets, index = hour) over the last 30 local days,
 * `todayKey` included. Migrated entries carry no real time of day, so they are left out.
 */
export function hourlyFocusMinutes(
	entries: readonly FocusHistoryEntry[],
	todayKey: string
): number[] {
	const buckets = new Array<number>(HOURS_PER_DAY).fill(0);
	const firstKey = addDaysToKey(todayKey, -(HOURLY_PATTERN_DAYS - 1));

	for (const entry of entries) {
		if (!isCompletedFocus(entry) || entry.migrated === true) {
			continue;
		}
		const dateKey = localDateKey(entry);
		if (dateKey >= firstKey && dateKey <= todayKey) {
			buckets[localHour(entry)] += completedFocusMinutes(entry);
		}
	}

	return buckets;
}

/**
 * Focus compliance over `fromKey..toKey` (inclusive): completed focus blocks over started ones.
 * Started = completed + skipped after running (`elapsedMs > 0`) + abandoned; a cold skip and breaks
 * never count. Migrated completions count as completed.
 */
export function focusCompliance(
	entries: readonly FocusHistoryEntry[],
	fromKey: string,
	toKey: string
): FocusCompliance {
	let completed = 0;
	let started = 0;

	for (const entry of entries) {
		if (entry.mode !== 'focus') {
			continue;
		}
		const dateKey = localDateKey(entry);
		if (dateKey < fromKey || dateKey > toKey) {
			continue;
		}
		if (entry.outcome === 'completed') {
			completed += 1;
			started += 1;
		} else if (entry.outcome === 'abandoned' || entry.elapsedMs > 0) {
			started += 1;
		}
	}

	return { completed, started, ratio: started === 0 ? null : completed / started };
}

/** Compliance of the week that contains `weekStart`, Monday to Sunday. */
export function weeklyFocusCompliance(
	entries: readonly FocusHistoryEntry[],
	weekStart: string
): FocusCompliance {
	const monday = weekStartKey(weekStart);
	return focusCompliance(entries, monday, addDaysToKey(monday, 6));
}
