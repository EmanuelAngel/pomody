import { describe, it, expect } from 'vitest';
import {
	FOCUS_HISTORY_RETENTION_DAYS,
	createEntryFromEvent,
	isValidFocusHistoryEntry,
	localDateKey,
	localHour,
	sanitizeFocusHistoryEntry,
	trimToRetention,
	type FocusHistoryEntry
} from './focus-history-entry.entity';
import type {
	BlockAbandonedEvent,
	BlockCompletedEvent,
	BlockSkippedEvent
} from '../events/block-completed.event';

const DAY_MS = 24 * 60 * 60 * 1000;
const NOW = new Date('2026-10-23T14:05:00.000Z');

function entry(overrides: Partial<FocusHistoryEntry> = {}): FocusHistoryEntry {
	return {
		mode: 'focus',
		outcome: 'completed',
		plannedMs: 1_500_000,
		elapsedMs: 1_500_000,
		endedAt: NOW.getTime(),
		utcOffsetMinutes: 0,
		...overrides
	};
}

function completed(overrides: Partial<BlockCompletedEvent> = {}): BlockCompletedEvent {
	return {
		type: 'block-completed',
		mode: 'focus',
		round: 1,
		totalRoundsCompleted: 1,
		durationMs: 1_500_000,
		elapsedMs: 1_500_000,
		completedAt: NOW,
		...overrides
	};
}

function skipped(overrides: Partial<BlockSkippedEvent> = {}): BlockSkippedEvent {
	return {
		type: 'block-skipped',
		mode: 'focus',
		round: 1,
		totalRoundsCompleted: 0,
		durationMs: 1_500_000,
		elapsedMs: 300_000,
		skippedAt: NOW,
		...overrides
	};
}

function abandoned(overrides: Partial<BlockAbandonedEvent> = {}): BlockAbandonedEvent {
	return {
		type: 'block-abandoned',
		mode: 'focus',
		round: 1,
		totalRoundsCompleted: 0,
		durationMs: 1_500_000,
		elapsedMs: 600_000,
		abandonedAt: NOW,
		...overrides
	};
}

const expectedOffset = 0 - NOW.getTimezoneOffset();

describe('createEntryFromEvent', () => {
	it('maps block-completed to a completed entry stamped with now and its local offset', () => {
		expect(createEntryFromEvent(completed(), NOW, null)).toEqual({
			mode: 'focus',
			outcome: 'completed',
			plannedMs: 1_500_000,
			elapsedMs: 1_500_000,
			endedAt: NOW.getTime(),
			utcOffsetMinutes: expectedOffset
		});
	});

	it('maps block-skipped to a skipped entry keeping the partial elapsed time', () => {
		expect(createEntryFromEvent(skipped(), NOW, null)).toEqual({
			mode: 'focus',
			outcome: 'skipped',
			plannedMs: 1_500_000,
			elapsedMs: 300_000,
			endedAt: NOW.getTime(),
			utcOffsetMinutes: expectedOffset
		});
	});

	it('keeps a cold skip with elapsedMs 0', () => {
		const result = createEntryFromEvent(skipped({ elapsedMs: 0 }), NOW, null);

		expect(result?.outcome).toBe('skipped');
		expect(result?.elapsedMs).toBe(0);
	});

	it('maps block-abandoned to an abandoned entry', () => {
		expect(createEntryFromEvent(abandoned(), NOW, null)).toEqual({
			mode: 'focus',
			outcome: 'abandoned',
			plannedMs: 1_500_000,
			elapsedMs: 600_000,
			endedAt: NOW.getTime(),
			utcOffsetMinutes: expectedOffset
		});
	});

	it('records break modes using the event planned duration', () => {
		const short = createEntryFromEvent(
			completed({ mode: 'shortBreak', durationMs: 300_000, elapsedMs: 300_000 }),
			NOW,
			null
		);
		const long = createEntryFromEvent(
			abandoned({ mode: 'longBreak', durationMs: 900_000, elapsedMs: 100_000 }),
			NOW,
			null
		);

		expect(short).toMatchObject({ mode: 'shortBreak', plannedMs: 300_000 });
		expect(long).toMatchObject({ mode: 'longBreak', plannedMs: 900_000, elapsedMs: 100_000 });
	});

	it('copies the active task id and title when there is one', () => {
		const result = createEntryFromEvent(completed(), NOW, { id: 't_3', title: 'Write report' });

		expect(result?.taskId).toBe('t_3');
		expect(result?.taskTitle).toBe('Write report');
	});

	it('never attributes a break to the active task, since planning may already point at the next focus task', () => {
		const task = { id: 't_4', title: 'Next focus task' };
		const short = createEntryFromEvent(
			completed({ mode: 'shortBreak', durationMs: 300_000, elapsedMs: 300_000 }),
			NOW,
			task
		);
		const long = createEntryFromEvent(
			skipped({ mode: 'longBreak', durationMs: 900_000, elapsedMs: 0 }),
			NOW,
			task
		);

		for (const result of [short, long]) {
			expect(result).not.toBeNull();
			expect(Object.keys(result as FocusHistoryEntry)).not.toContain('taskId');
			expect(Object.keys(result as FocusHistoryEntry)).not.toContain('taskTitle');
		}
	});

	it('omits taskId and taskTitle entirely without an active task', () => {
		const result = createEntryFromEvent(completed(), NOW, null);

		expect(result).not.toBeNull();
		expect(Object.keys(result as FocusHistoryEntry)).not.toContain('taskId');
		expect(Object.keys(result as FocusHistoryEntry)).not.toContain('taskTitle');
	});

	it('derives the offset east-positive from the injected Date, not a constant', () => {
		const other = new Date('2026-01-15T10:00:00.000Z');

		expect(createEntryFromEvent(completed(), other, null)?.utcOffsetMinutes).toBe(
			0 - other.getTimezoneOffset()
		);
		expect(createEntryFromEvent(completed(), other, null)?.endedAt).toBe(other.getTime());
	});

	it('clamps elapsed time to the planned duration so the entry stays valid', () => {
		const result = createEntryFromEvent(skipped({ elapsedMs: 2_000_000 }), NOW, null);

		expect(result?.elapsedMs).toBe(1_500_000);
		expect(isValidFocusHistoryEntry(result)).toBe(true);
	});

	it('returns null when the event durations are not usable', () => {
		expect(createEntryFromEvent(completed({ durationMs: Number.NaN }), NOW, null)).toBeNull();
		expect(createEntryFromEvent(completed({ durationMs: -1 }), NOW, null)).toBeNull();
	});
});

describe('isValidFocusHistoryEntry', () => {
	it('accepts a minimal entry and one with task data and the migrated flag', () => {
		expect(isValidFocusHistoryEntry(entry())).toBe(true);
		expect(
			isValidFocusHistoryEntry(entry({ taskId: 't_1', taskTitle: 'Task', migrated: true }))
		).toBe(true);
	});

	it('accepts every mode and outcome', () => {
		for (const mode of ['focus', 'shortBreak', 'longBreak'] as const) {
			for (const outcome of ['completed', 'skipped', 'abandoned'] as const) {
				expect(isValidFocusHistoryEntry(entry({ mode, outcome }))).toBe(true);
			}
		}
	});

	it('rejects non-objects', () => {
		for (const raw of [null, undefined, 'x', 42, [], true]) {
			expect(isValidFocusHistoryEntry(raw)).toBe(false);
		}
	});

	it('rejects unknown mode or outcome', () => {
		expect(isValidFocusHistoryEntry({ ...entry(), mode: 'nap' })).toBe(false);
		expect(isValidFocusHistoryEntry({ ...entry(), outcome: 'failed' })).toBe(false);
	});

	it('requires non-negative integer durations', () => {
		expect(isValidFocusHistoryEntry(entry({ plannedMs: -1 }))).toBe(false);
		expect(isValidFocusHistoryEntry(entry({ elapsedMs: -1 }))).toBe(false);
		expect(isValidFocusHistoryEntry(entry({ plannedMs: 1.5, elapsedMs: 0 }))).toBe(false);
		expect(isValidFocusHistoryEntry(entry({ elapsedMs: 0.5 }))).toBe(false);
		expect(isValidFocusHistoryEntry({ ...entry(), plannedMs: '1500000' })).toBe(false);
		expect(isValidFocusHistoryEntry(entry({ plannedMs: 0, elapsedMs: 0 }))).toBe(true);
	});

	it('requires elapsed <= planned, accepting equality', () => {
		expect(isValidFocusHistoryEntry(entry({ plannedMs: 1000, elapsedMs: 1000 }))).toBe(true);
		expect(isValidFocusHistoryEntry(entry({ plannedMs: 1000, elapsedMs: 1001 }))).toBe(false);
	});

	it('requires a finite endedAt', () => {
		expect(isValidFocusHistoryEntry(entry({ endedAt: Number.NaN }))).toBe(false);
		expect(isValidFocusHistoryEntry(entry({ endedAt: Infinity }))).toBe(false);
		expect(isValidFocusHistoryEntry({ ...entry(), endedAt: '2026-10-23' })).toBe(false);
	});

	it('rejects an endedAt outside the Date range or with a fractional value', () => {
		expect(isValidFocusHistoryEntry(entry({ endedAt: 1e20 }))).toBe(false);
		expect(isValidFocusHistoryEntry(entry({ endedAt: 8.64e15 + 1 }))).toBe(false);
		expect(isValidFocusHistoryEntry(entry({ endedAt: 1.5 }))).toBe(false);
		expect(isValidFocusHistoryEntry(entry({ endedAt: 8.64e15 }))).toBe(true);
	});

	it('requires an integer offset within ±14h, boundaries inclusive', () => {
		expect(isValidFocusHistoryEntry(entry({ utcOffsetMinutes: 840 }))).toBe(true);
		expect(isValidFocusHistoryEntry(entry({ utcOffsetMinutes: -840 }))).toBe(true);
		expect(isValidFocusHistoryEntry(entry({ utcOffsetMinutes: 841 }))).toBe(false);
		expect(isValidFocusHistoryEntry(entry({ utcOffsetMinutes: -841 }))).toBe(false);
		expect(isValidFocusHistoryEntry(entry({ utcOffsetMinutes: 330.5 }))).toBe(false);
		expect(isValidFocusHistoryEntry({ ...entry(), utcOffsetMinutes: undefined })).toBe(false);
	});

	it('requires optional task fields to be strings and migrated to be literally true', () => {
		expect(isValidFocusHistoryEntry({ ...entry(), taskId: 7 })).toBe(false);
		expect(isValidFocusHistoryEntry({ ...entry(), taskTitle: null })).toBe(false);
		expect(isValidFocusHistoryEntry({ ...entry(), migrated: false })).toBe(false);
		expect(isValidFocusHistoryEntry({ ...entry(), migrated: 'yes' })).toBe(false);
	});
});

describe('sanitizeFocusHistoryEntry', () => {
	it('returns a frozen copy without unknown fields', () => {
		const result = sanitizeFocusHistoryEntry({ ...entry({ taskId: 't_1' }), extra: 'x' });

		expect(result).toEqual(entry({ taskId: 't_1' }));
		expect(Object.isFrozen(result)).toBe(true);
	});

	it('returns null for invalid input', () => {
		expect(sanitizeFocusHistoryEntry({ ...entry(), mode: 'nap' })).toBeNull();
	});
});

describe('localDateKey / localHour', () => {
	it('uses the stored offset for a positive offset (+540, Tokyo)', () => {
		// 2026-10-23T20:30Z is already 2026-10-24 05:30 in +09:00.
		const tokyo = entry({ endedAt: Date.parse('2026-10-23T20:30:00Z'), utcOffsetMinutes: 540 });

		expect(localDateKey(tokyo)).toBe('2026-10-24');
		expect(localHour(tokyo)).toBe(5);
	});

	it('uses the stored offset for a negative offset (-180, Buenos Aires)', () => {
		// 2026-10-24T01:30Z is still 2026-10-23 22:30 in -03:00.
		const buenosAires = entry({
			endedAt: Date.parse('2026-10-24T01:30:00Z'),
			utcOffsetMinutes: -180
		});

		expect(localDateKey(buenosAires)).toBe('2026-10-23');
		expect(localHour(buenosAires)).toBe(22);
	});

	it('keeps a block that crossed midnight UTC on its local day', () => {
		const lateLocal = entry({
			endedAt: Date.parse('2026-10-24T00:10:00Z'),
			utcOffsetMinutes: -180
		});

		expect(localDateKey(lateLocal)).toBe('2026-10-23');
		expect(localHour(lateLocal)).toBe(21);
	});

	it('handles half-hour offsets and the exact midnight boundary', () => {
		const india = entry({ endedAt: Date.parse('2026-10-23T18:30:00Z'), utcOffsetMinutes: 330 });

		expect(localDateKey(india)).toBe('2026-10-24');
		expect(localHour(india)).toBe(0);
	});

	it('rolls month and year boundaries', () => {
		const newYear = entry({ endedAt: Date.parse('2026-12-31T23:30:00Z'), utcOffsetMinutes: 60 });

		expect(localDateKey(newYear)).toBe('2027-01-01');
		expect(localHour(newYear)).toBe(0);
	});
});

describe('trimToRetention', () => {
	it('exposes a one-year retention', () => {
		expect(FOCUS_HISTORY_RETENTION_DAYS).toBe(365);
	});

	it('keeps an entry exactly 365 days old and drops one a millisecond older', () => {
		const boundary = entry({ endedAt: NOW.getTime() - 365 * DAY_MS });
		const older = entry({ endedAt: NOW.getTime() - 365 * DAY_MS - 1 });
		const recent = entry({ endedAt: NOW.getTime() - DAY_MS });

		expect(trimToRetention([older, boundary, recent], NOW)).toEqual([boundary, recent]);
	});

	it('keeps future-dated entries and does not mutate its input', () => {
		const future = entry({ endedAt: NOW.getTime() + DAY_MS });
		const input = [future];

		const result = trimToRetention(input, NOW);

		expect(result).toEqual([future]);
		expect(result).not.toBe(input);
	});
});
