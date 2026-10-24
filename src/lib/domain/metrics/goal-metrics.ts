import { completedFocusMinutes, isCompletedFocus } from '$lib/domain/history/daily-focus-summary';
import {
	localDateKey,
	type FocusHistoryEntry
} from '$lib/domain/history/focus-history-entry.entity';
import { goalForDate, type DailyGoalChange } from '$lib/domain/goals/daily-goal.entity';
import { addDaysToKey, isoWeekdayOfKey, weekDayKeys } from './date-key';

/**
 * Today's progress towards the daily goal.
 * - `null` (returned by `todayGoalProgress`): no goal is in force today (never set, before the
 *   first one, or removed).
 * - `rest_day`: a goal exists but today is one of its rest days; there is nothing to reach.
 * - `active`: `ratio` is raw (`minutes / goalMinutes`, may exceed 1); capping it is the UI's job.
 */
export type TodayGoalProgress =
	| { readonly kind: 'rest_day'; readonly minutes: number }
	| {
			readonly kind: 'active';
			readonly goalMinutes: number;
			readonly minutes: number;
			readonly ratio: number;
			readonly met: boolean;
	  };

export interface WeekGoalAttainment {
	readonly metDays: number;
	readonly evaluatedDays: number;
	/** `metDays / evaluatedDays`, or null when no day of the week has been evaluated yet. */
	readonly ratio: number | null;
}

/** Completed focus minutes per local day, computed in one pass over the history. */
function minutesByDay(entries: readonly FocusHistoryEntry[]): Map<string, number> {
	const byDay = new Map<string, number>();
	for (const entry of entries) {
		if (isCompletedFocus(entry)) {
			const dateKey = localDateKey(entry);
			byDay.set(dateKey, (byDay.get(dateKey) ?? 0) + completedFocusMinutes(entry));
		}
	}
	return byDay;
}

/** The goal that makes `dateKey` an evaluated working day, or null for no goal / a rest day. */
function workingDayGoal(
	goalHistory: readonly DailyGoalChange[],
	dateKey: string
): DailyGoalChange | null {
	const goal = goalForDate(goalHistory, dateKey);
	if (goal === null || goal.restWeekdays.includes(isoWeekdayOfKey(dateKey))) {
		return null;
	}
	return goal;
}

export function todayGoalProgress(
	entries: readonly FocusHistoryEntry[],
	goalHistory: readonly DailyGoalChange[],
	todayKey: string
): TodayGoalProgress | null {
	const goal = goalForDate(goalHistory, todayKey);
	if (goal === null) {
		return null;
	}

	const minutes = minutesByDay(entries).get(todayKey) ?? 0;
	if (goal.restWeekdays.includes(isoWeekdayOfKey(todayKey))) {
		return { kind: 'rest_day', minutes };
	}

	return {
		kind: 'active',
		goalMinutes: goal.minutes,
		minutes,
		ratio: minutes / goal.minutes,
		met: minutes >= goal.minutes
	};
}

/**
 * Share of the week's working days that met their goal, each judged by the goal in force that day.
 * Evaluated days are those up to `todayKey` with a goal that are not rest days. Today only enters
 * once it is met: an unmet today is still in progress and must not lower the percentage (the same
 * rule that keeps it from breaking the streak). Days after today are never evaluated.
 */
export function weekGoalAttainment(
	entries: readonly FocusHistoryEntry[],
	goalHistory: readonly DailyGoalChange[],
	weekStart: string,
	todayKey: string
): WeekGoalAttainment {
	const byDay = minutesByDay(entries);
	let metDays = 0;
	let evaluatedDays = 0;

	for (const dateKey of weekDayKeys(weekStart)) {
		if (dateKey > todayKey) {
			break;
		}
		const goal = workingDayGoal(goalHistory, dateKey);
		if (goal === null) {
			continue;
		}
		if ((byDay.get(dateKey) ?? 0) >= goal.minutes) {
			metDays += 1;
			evaluatedDays += 1;
		} else if (dateKey < todayKey) {
			evaluatedDays += 1;
		}
	}

	return { metDays, evaluatedDays, ratio: evaluatedDays === 0 ? null : metDays / evaluatedDays };
}

/**
 * Consecutive working days that met their goal, walking back from today.
 * - Today counts when met and is skipped when not (the day is not over yet).
 * - Rest days are skipped: they neither add to the streak nor break it.
 * - A day with no goal (before the first one, or after a removal) ends the streak.
 * - The first evaluated day that missed its goal ends the streak.
 * Cost is linear in the days walked; minutes per day are aggregated once.
 */
export function goalStreak(
	entries: readonly FocusHistoryEntry[],
	goalHistory: readonly DailyGoalChange[],
	todayKey: string
): number {
	const byDay = minutesByDay(entries);
	let streak = 0;

	for (let dateKey = todayKey; ; dateKey = addDaysToKey(dateKey, -1)) {
		const goal = goalForDate(goalHistory, dateKey);
		if (goal === null) {
			return streak;
		}
		if (goal.restWeekdays.includes(isoWeekdayOfKey(dateKey))) {
			continue;
		}
		if ((byDay.get(dateKey) ?? 0) >= goal.minutes) {
			streak += 1;
		} else if (dateKey !== todayKey) {
			return streak;
		}
	}
}
