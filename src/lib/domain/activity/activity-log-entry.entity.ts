import type { DomainEvent } from '../events/block-completed.event';
import type { TimerMode } from '../timer/timer-fsm';

export const ACTIVITY_KINDS = [
	'block-started',
	'block-paused',
	'block-resumed',
	'block-completed',
	'block-skipped',
	'block-abandoned',
	'config-changed',
	'session-started',
	'session-ended',
	'session-restored',
	'task-assigned',
	'task-unassigned',
	'task-completed',
	'plan-modified',
	'daily-goal-changed'
] as const;

export type ActivityKind = (typeof ACTIVITY_KINDS)[number];

/**
 * One user-visible action in the activity trace. `detail` is language-neutral data shown next to
 * the prose (a task title, `25/5/15 ×4`, a goal in minutes); `mode` names the block it acted on.
 */
export interface ActivityLogEntry {
	readonly kind: ActivityKind;
	/** Epoch milliseconds (UTC) of the action. */
	readonly at: number;
	/** Local offset from UTC at `at` in minutes, east-positive. */
	readonly utcOffsetMinutes: number;
	readonly mode?: TimerMode;
	readonly detail?: string;
}

export type ActivityDetails = Pick<ActivityLogEntry, 'mode' | 'detail'>;

export const ACTIVITY_LOG_RETENTION_DAYS = 30;

const MS_PER_MINUTE = 60 * 1000;
const MS_PER_DAY = 24 * 60 * MS_PER_MINUTE;
const MAX_UTC_OFFSET_MINUTES = 14 * 60;
const MAX_DATE_MS = 8.64e15;
const VALID_MODES: readonly TimerMode[] = ['focus', 'shortBreak', 'longBreak'];

/** Returns a frozen entry with only the known fields, or null when the input is malformed. */
export function sanitizeActivityLogEntry(raw: unknown): ActivityLogEntry | null {
	if (typeof raw !== 'object' || raw === null || Array.isArray(raw)) {
		return null;
	}
	const c = raw as Record<string, unknown>;

	if (!ACTIVITY_KINDS.includes(c.kind as ActivityKind)) return null;
	if (typeof c.at !== 'number' || !Number.isInteger(c.at) || Math.abs(c.at) > MAX_DATE_MS) {
		return null;
	}
	if (
		typeof c.utcOffsetMinutes !== 'number' ||
		!Number.isInteger(c.utcOffsetMinutes) ||
		Math.abs(c.utcOffsetMinutes) > MAX_UTC_OFFSET_MINUTES
	) {
		return null;
	}
	if (c.mode !== undefined && !VALID_MODES.includes(c.mode as TimerMode)) return null;
	if (c.detail !== undefined && typeof c.detail !== 'string') return null;

	return Object.freeze({
		kind: c.kind as ActivityKind,
		at: c.at,
		utcOffsetMinutes: c.utcOffsetMinutes,
		...(c.mode !== undefined ? { mode: c.mode as TimerMode } : {}),
		...(c.detail !== undefined ? { detail: c.detail } : {})
	});
}

/** Stamps an action with the instant and the local offset in force at `now`. */
export function createActivityEntry(
	kind: ActivityKind,
	now: Date,
	details: ActivityDetails = {}
): ActivityLogEntry | null {
	return sanitizeActivityLogEntry({
		kind,
		at: now.getTime(),
		// `0 -` instead of unary minus: avoids a negative zero for UTC.
		utcOffsetMinutes: Math.round(0 - now.getTimezoneOffset()),
		...details
	});
}

/** Cadence as `focus/short/long ×rounds` in minutes, the same in every language. */
export function formatCadence(config: {
	focusDurationSeconds: number;
	shortBreakDurationSeconds: number;
	longBreakDurationSeconds: number;
	roundsBeforeLongBreak: number;
}): string {
	const minutes = (seconds: number) => Math.round(seconds / 60);
	return `${minutes(config.focusDurationSeconds)}/${minutes(config.shortBreakDurationSeconds)}/${minutes(config.longBreakDurationSeconds)} ×${config.roundsBeforeLongBreak}`;
}

/** Maps a timer domain event to the kind and details of its activity entry. */
export function activityFromTimerEvent(event: DomainEvent): {
	kind: ActivityKind;
	details: ActivityDetails;
} {
	if (event.type === 'config-changed') {
		return { kind: 'config-changed', details: { detail: formatCadence(event.config) } };
	}
	return { kind: event.type, details: { mode: event.mode } };
}

/** The entry's wall-clock moment, read through UTC getters so the machine's timezone never leaks in. */
function localMoment(entry: ActivityLogEntry): Date {
	return new Date(entry.at + entry.utcOffsetMinutes * MS_PER_MINUTE);
}

/** Local calendar day as `YYYY-MM-DD`, from the offset stored with the entry. */
export function activityDateKey(entry: ActivityLogEntry): string {
	return localMoment(entry).toISOString().slice(0, 10);
}

/** Local `HH:MM`, from the offset stored with the entry. */
export function activityTime(entry: ActivityLogEntry): string {
	return localMoment(entry).toISOString().slice(11, 16);
}

/** Drops entries older than the retention window; an entry exactly at the boundary is kept. */
export function trimActivityToRetention(
	entries: readonly ActivityLogEntry[],
	now: Date
): ActivityLogEntry[] {
	const cutoff = now.getTime() - ACTIVITY_LOG_RETENTION_DAYS * MS_PER_DAY;
	return entries.filter((entry) => entry.at >= cutoff);
}

/** Days newest first, and inside each day the newest action first. */
export function groupActivityByDay(
	entries: readonly ActivityLogEntry[]
): { dateKey: string; entries: ActivityLogEntry[] }[] {
	const days = new Map<string, ActivityLogEntry[]>();
	for (const entry of [...entries].sort((a, b) => b.at - a.at)) {
		const key = activityDateKey(entry);
		const day = days.get(key);
		if (day) day.push(entry);
		else days.set(key, [entry]);
	}
	return [...days].map(([dateKey, dayEntries]) => ({ dateKey, entries: dayEntries }));
}
