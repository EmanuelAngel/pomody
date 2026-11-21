import { describe, it, expect } from 'vitest';
import {
	ACTIVITY_LOG_RETENTION_DAYS,
	activityDateKey,
	activityFromTimerEvent,
	activityTime,
	createActivityEntry,
	groupActivityByDay,
	sanitizeActivityLogEntry,
	trimActivityToRetention,
	type ActivityLogEntry
} from './activity-log-entry.entity';
import { DEFAULT_TIMER_CONFIG } from '../timer/timer-fsm';

const DAY_MS = 24 * 60 * 60 * 1000;
const NOW = new Date('2026-11-20T15:00:00.000Z');

function entry(overrides: Partial<ActivityLogEntry> = {}): ActivityLogEntry {
	return { kind: 'block-started', at: NOW.getTime(), utcOffsetMinutes: -180, ...overrides };
}

describe('sanitizeActivityLogEntry', () => {
	it('keeps only the known fields of a valid entry', () => {
		const result = sanitizeActivityLogEntry({ ...entry({ mode: 'focus' }), extra: 1 });
		expect(result).toEqual(entry({ mode: 'focus' }));
		expect(Object.isFrozen(result)).toBe(true);
	});

	it.each([
		['unknown kind', { kind: 'app-opened' }],
		['non-integer instant', { at: 1.5 }],
		['offset beyond 14h', { utcOffsetMinutes: 900 }],
		['unknown mode', { mode: 'nap' }],
		['non-string detail', { detail: 25 }]
	])('rejects an entry with %s', (_label, overrides) => {
		expect(sanitizeActivityLogEntry({ ...entry(), ...overrides })).toBeNull();
	});

	it('rejects non-objects', () => {
		expect(sanitizeActivityLogEntry(null)).toBeNull();
		expect(sanitizeActivityLogEntry([])).toBeNull();
		expect(sanitizeActivityLogEntry('block-started')).toBeNull();
	});
});

describe('createActivityEntry', () => {
	it('stamps the instant and an east-positive offset', () => {
		const result = createActivityEntry('task-completed', NOW, { detail: 'Write' });
		expect(result).toMatchObject({ kind: 'task-completed', at: NOW.getTime(), detail: 'Write' });
		expect(result?.utcOffsetMinutes).toBe(0 - NOW.getTimezoneOffset());
	});
});

describe('activityFromTimerEvent', () => {
	it('maps block events to their kind and mode', () => {
		expect(
			activityFromTimerEvent({ type: 'block-paused', mode: 'focus', round: 1, remainingMs: 10 })
		).toEqual({ kind: 'block-paused', details: { mode: 'focus' } });
		expect(
			activityFromTimerEvent({
				type: 'block-abandoned',
				mode: 'shortBreak',
				round: 1,
				totalRoundsCompleted: 1,
				durationMs: 300_000,
				elapsedMs: 1000,
				abandonedAt: NOW
			})
		).toEqual({ kind: 'block-abandoned', details: { mode: 'shortBreak' } });
	});

	it('describes a config change as the cadence in minutes', () => {
		expect(
			activityFromTimerEvent({ type: 'config-changed', config: DEFAULT_TIMER_CONFIG })
		).toEqual({ kind: 'config-changed', details: { detail: '25/5/15 ×4' } });
	});
});

describe('local day and time', () => {
	it('reads the day and HH:MM from the offset stored with the entry', () => {
		const lateNight = entry({ at: Date.parse('2026-11-21T02:30:00Z'), utcOffsetMinutes: -180 });
		expect(activityDateKey(lateNight)).toBe('2026-11-20');
		expect(activityTime(lateNight)).toBe('23:30');
	});
});

describe('trimActivityToRetention', () => {
	it('drops entries older than the retention window and keeps the boundary', () => {
		const boundary = entry({ at: NOW.getTime() - ACTIVITY_LOG_RETENTION_DAYS * DAY_MS });
		const expired = entry({ at: boundary.at - 1 });
		const recent = entry();
		expect(trimActivityToRetention([expired, boundary, recent], NOW)).toEqual([boundary, recent]);
	});
});

describe('groupActivityByDay', () => {
	it('orders days newest first and entries newest first inside each day', () => {
		const monday = entry({ at: Date.parse('2026-11-16T12:00:00Z'), kind: 'session-started' });
		const tuesdayEarly = entry({ at: Date.parse('2026-11-17T12:00:00Z') });
		const tuesdayLate = entry({ at: Date.parse('2026-11-17T13:00:00Z'), kind: 'block-paused' });

		expect(groupActivityByDay([monday, tuesdayEarly, tuesdayLate])).toEqual([
			{ dateKey: '2026-11-17', entries: [tuesdayLate, tuesdayEarly] },
			{ dateKey: '2026-11-16', entries: [monday] }
		]);
	});
});
