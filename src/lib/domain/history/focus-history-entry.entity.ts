import type { DomainEvent } from '../events/block-completed.event';
import type { TimerMode } from '../timer/timer-fsm';

export type FocusHistoryOutcome = 'completed' | 'skipped' | 'abandoned';

/** The task a block was attributed to; the title is a copy taken at the time of the block. */
export interface FocusHistoryTask {
	readonly id: string;
	readonly title: string;
}

/**
 * One finished block of the timer, whatever its mode or outcome.
 * Day and hour are derived from `endedAt` plus the offset that was in force at that moment,
 * so a later change of timezone never moves an old entry to another day.
 */
export interface FocusHistoryEntry {
	readonly mode: TimerMode;
	readonly outcome: FocusHistoryOutcome;
	readonly plannedMs: number;
	/** Time the block actually ran, excluding pauses. */
	readonly elapsedMs: number;
	/** Epoch milliseconds (UTC) at which the block ended. */
	readonly endedAt: number;
	/** Local offset from UTC at `endedAt` in minutes, east-positive. */
	readonly utcOffsetMinutes: number;
	readonly taskId?: string;
	readonly taskTitle?: string;
	/** Present only on entries converted from the legacy daily counter. */
	readonly migrated?: true;
}

export const FOCUS_HISTORY_RETENTION_DAYS = 365;

/** Largest real-world UTC offset is +14:00; the smallest is -12:00. */
const MAX_UTC_OFFSET_MINUTES = 14 * 60;
const MS_PER_MINUTE = 60 * 1000;
const MS_PER_DAY = 24 * 60 * MS_PER_MINUTE;

const VALID_MODES: readonly TimerMode[] = ['focus', 'shortBreak', 'longBreak'];
const VALID_OUTCOMES: readonly FocusHistoryOutcome[] = ['completed', 'skipped', 'abandoned'];

function isNonNegativeInteger(value: unknown): value is number {
	return typeof value === 'number' && Number.isInteger(value) && value >= 0;
}

/**
 * Defensive validation of untrusted input (storage payloads, imports).
 * Returns a frozen entry containing only the known fields, or null when anything is off.
 */
export function sanitizeFocusHistoryEntry(raw: unknown): FocusHistoryEntry | null {
	if (typeof raw !== 'object' || raw === null || Array.isArray(raw)) {
		return null;
	}

	const candidate = raw as Record<string, unknown>;

	if (!VALID_MODES.includes(candidate.mode as TimerMode)) {
		return null;
	}
	if (!VALID_OUTCOMES.includes(candidate.outcome as FocusHistoryOutcome)) {
		return null;
	}
	if (!isNonNegativeInteger(candidate.plannedMs) || !isNonNegativeInteger(candidate.elapsedMs)) {
		return null;
	}
	if (candidate.elapsedMs > candidate.plannedMs) {
		return null;
	}
	if (
		typeof candidate.endedAt !== 'number' ||
		!Number.isInteger(candidate.endedAt) ||
		Math.abs(candidate.endedAt) > MAX_DATE_MS
	) {
		return null;
	}
	if (
		typeof candidate.utcOffsetMinutes !== 'number' ||
		!Number.isInteger(candidate.utcOffsetMinutes) ||
		Math.abs(candidate.utcOffsetMinutes) > MAX_UTC_OFFSET_MINUTES
	) {
		return null;
	}
	if (candidate.taskId !== undefined && typeof candidate.taskId !== 'string') {
		return null;
	}
	if (candidate.taskTitle !== undefined && typeof candidate.taskTitle !== 'string') {
		return null;
	}
	if (candidate.migrated !== undefined && candidate.migrated !== true) {
		return null;
	}

	const entry: FocusHistoryEntry = {
		mode: candidate.mode as TimerMode,
		outcome: candidate.outcome as FocusHistoryOutcome,
		plannedMs: candidate.plannedMs,
		elapsedMs: candidate.elapsedMs,
		endedAt: candidate.endedAt,
		utcOffsetMinutes: candidate.utcOffsetMinutes,
		...(candidate.taskId !== undefined ? { taskId: candidate.taskId } : {}),
		...(candidate.taskTitle !== undefined ? { taskTitle: candidate.taskTitle } : {}),
		...(candidate.migrated === true ? { migrated: true as const } : {})
	};

	return Object.freeze(entry);
}

export function isValidFocusHistoryEntry(raw: unknown): boolean {
	return sanitizeFocusHistoryEntry(raw) !== null;
}

/**
 * Builds the history entry for a timer domain event.
 * `now` is the recording instant: it stamps `endedAt` and fixes the local offset in force then.
 * Returns null when the event carries durations that cannot form a valid entry.
 */
/** Largest epoch-ms magnitude a `Date` can represent (ECMAScript time value range). */
const MAX_DATE_MS = 8.64e15;

export function createEntryFromEvent(
	event: DomainEvent,
	now: Date,
	activeTask: FocusHistoryTask | null
): FocusHistoryEntry | null {
	const outcome: FocusHistoryOutcome =
		event.type === 'block-completed'
			? 'completed'
			: event.type === 'block-skipped'
				? 'skipped'
				: 'abandoned';

	if (!isNonNegativeInteger(event.durationMs) || !Number.isFinite(event.elapsedMs)) {
		return null;
	}

	const plannedMs = event.durationMs;
	const elapsedMs = Math.min(plannedMs, Math.max(0, Math.round(event.elapsedMs)));

	return sanitizeFocusHistoryEntry({
		mode: event.mode,
		outcome,
		plannedMs,
		elapsedMs,
		endedAt: now.getTime(),
		// `0 -` instead of unary minus: avoids a negative zero for UTC.
		utcOffsetMinutes: Math.round(0 - now.getTimezoneOffset()),
		// Only focus blocks work on a task. When a break ends, planning has already switched
		// the active task to the next focus block, so attributing breaks would be wrong.
		...(activeTask && event.mode === 'focus'
			? { taskId: activeTask.id, taskTitle: activeTask.title }
			: {})
	});
}

/** The entry's wall-clock moment, read through UTC getters so the machine's timezone never leaks in. */
function localMoment(entry: FocusHistoryEntry): Date {
	return new Date(entry.endedAt + entry.utcOffsetMinutes * MS_PER_MINUTE);
}

/** Local calendar day as `YYYY-MM-DD`, from the offset stored with the entry. */
export function localDateKey(entry: FocusHistoryEntry): string {
	const moment = localMoment(entry);
	const year = String(moment.getUTCFullYear()).padStart(4, '0');
	const month = String(moment.getUTCMonth() + 1).padStart(2, '0');
	const day = String(moment.getUTCDate()).padStart(2, '0');
	return `${year}-${month}-${day}`;
}

/** Local hour of day (0-23), from the offset stored with the entry. */
export function localHour(entry: FocusHistoryEntry): number {
	return localMoment(entry).getUTCHours();
}

/** Drops entries older than the retention window; an entry exactly at the boundary is kept. */
export function trimToRetention(
	entries: readonly FocusHistoryEntry[],
	now: Date
): FocusHistoryEntry[] {
	const cutoff = now.getTime() - FOCUS_HISTORY_RETENTION_DAYS * MS_PER_DAY;
	return entries.filter((entry) => entry.endedAt >= cutoff);
}
