/**
 * Daily goal entity: how many focus minutes the user wants each day and which weekdays are rest
 * days, as a list of changes with an effective date. A past day is judged by the goal that was in
 * force back then, so editing the goal never rewrites history.
 *
 * Pure TypeScript: no DOM, Svelte or Tauri. Dates are local `YYYY-MM-DD` keys, the same shape as
 * `getLocalDateString`, so they compare chronologically as plain strings.
 */

/** One goal edit, effective from `effectiveFrom` (inclusive) until the next change. */
export interface DailyGoalChange {
	/** Local calendar day the change starts to apply, `YYYY-MM-DD`. */
	readonly effectiveFrom: string;
	/**
	 * Focus minutes per day: an integer from 1 to `MAX_DAILY_GOAL_MINUTES`.
	 * `0` is the explicit "no goal from this day on": it ends the previous goal and the days
	 * after it are not evaluated, exactly like the days before the first goal.
	 */
	readonly minutes: number;
	/** ISO weekdays (1 = Monday ... 7 = Sunday) that are rest days: unique, sorted, at most six. */
	readonly restWeekdays: readonly number[];
}

/** Upper bound for a daily goal: a whole day. Anything above cannot be met. */
export const MAX_DAILY_GOAL_MINUTES = 1440;

/** At least one weekday must stay a working day, otherwise the goal could never be evaluated. */
export const MAX_REST_WEEKDAYS = 6;

/** Every ISO weekday in calendar order, Monday first. */
export const ISO_WEEKDAYS: readonly number[] = Object.freeze([1, 2, 3, 4, 5, 6, 7]);

/** Why a goal change was rejected. */
export type DailyGoalValidationError = 'invalid_date' | 'invalid_minutes' | 'invalid_rest_weekdays';

export type DailyGoalValidation =
	| { readonly ok: true; readonly change: DailyGoalChange }
	| { readonly ok: false; readonly reason: DailyGoalValidationError };

const DATE_KEY_PATTERN = /^(\d{4})-(\d{2})-(\d{2})$/;

/** True for a real calendar day written as `YYYY-MM-DD` (rejects `2026-02-30`). */
function isDateKey(value: unknown): value is string {
	if (typeof value !== 'string') {
		return false;
	}

	const match = DATE_KEY_PATTERN.exec(value);
	if (match === null) {
		return false;
	}

	const [year, month, day] = [Number(match[1]), Number(match[2]), Number(match[3])];
	const probe = new Date(Date.UTC(year, month - 1, day));

	return (
		probe.getUTCFullYear() === year &&
		probe.getUTCMonth() === month - 1 &&
		probe.getUTCDate() === day
	);
}

function isValidMinutes(value: unknown): value is number {
	return (
		typeof value === 'number' &&
		Number.isInteger(value) &&
		value >= 0 &&
		value <= MAX_DAILY_GOAL_MINUTES
	);
}

function isIsoWeekday(value: unknown): value is number {
	return typeof value === 'number' && Number.isInteger(value) && value >= 1 && value <= 7;
}

/**
 * Validates a goal change the user is trying to apply, or one read back from storage.
 * Rejection order is stable: date, minutes, rest weekdays. Rest weekdays come back sorted;
 * duplicates and a seventh rest day are rejected, never silently fixed.
 */
export function validateDailyGoalChange(raw: unknown): DailyGoalValidation {
	if (typeof raw !== 'object' || raw === null || Array.isArray(raw)) {
		return { ok: false, reason: 'invalid_date' };
	}

	const candidate = raw as Record<string, unknown>;

	if (!isDateKey(candidate.effectiveFrom)) {
		return { ok: false, reason: 'invalid_date' };
	}

	if (!isValidMinutes(candidate.minutes)) {
		return { ok: false, reason: 'invalid_minutes' };
	}

	const rawWeekdays = candidate.restWeekdays;
	if (
		!Array.isArray(rawWeekdays) ||
		!rawWeekdays.every(isIsoWeekday) ||
		new Set(rawWeekdays).size !== rawWeekdays.length ||
		rawWeekdays.length > MAX_REST_WEEKDAYS
	) {
		return { ok: false, reason: 'invalid_rest_weekdays' };
	}

	// Rest days are a property of a goal: a removal carries none.
	const restWeekdays = candidate.minutes === 0 ? [] : [...rawWeekdays].sort((a, b) => a - b);

	return {
		ok: true,
		change: Object.freeze({
			effectiveFrom: candidate.effectiveFrom,
			minutes: candidate.minutes,
			restWeekdays: Object.freeze(restWeekdays)
		})
	};
}

/**
 * Defensive validation of a persisted change. Returns a frozen change or null when it is corrupt,
 * so one damaged entry never takes down the rest of the history.
 */
export function sanitizeDailyGoalChange(raw: unknown): DailyGoalChange | null {
	const validation = validateDailyGoalChange(raw);
	return validation.ok ? validation.change : null;
}

/**
 * Returns the history with `change` applied. A change for a day that already has an entry replaces
 * it, so repeated edits on the same day collapse into one; every other entry is kept as it was and
 * the list stays sorted by effective date. An invalid change leaves the history untouched.
 */
export function applyGoalChange(
	history: readonly DailyGoalChange[],
	change: DailyGoalChange
): readonly DailyGoalChange[] {
	const sanitized = sanitizeDailyGoalChange(change);
	if (sanitized === null) {
		return history;
	}

	const others = history.filter((entry) => entry.effectiveFrom !== sanitized.effectiveFrom);
	const next = [...others, sanitized].sort((a, b) =>
		a.effectiveFrom.localeCompare(b.effectiveFrom)
	);

	return Object.freeze(next);
}

/**
 * The goal in force on a day: the latest change effective on or before it.
 * Null before the first goal and after a removal (`minutes = 0`): such days are not evaluated.
 */
export function goalForDate(
	history: readonly DailyGoalChange[],
	dateKey: string
): DailyGoalChange | null {
	if (!isDateKey(dateKey)) {
		return null;
	}

	let inForce: DailyGoalChange | null = null;
	for (const entry of history) {
		if (
			entry.effectiveFrom <= dateKey &&
			(inForce === null || entry.effectiveFrom >= inForce.effectiveFrom)
		) {
			inForce = entry;
		}
	}

	return inForce !== null && inForce.minutes > 0 ? inForce : null;
}
