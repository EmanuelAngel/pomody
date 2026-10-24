import { describe, it, expect } from 'vitest';
import { summarizeDailyFocus } from './daily-focus-summary';
import type { FocusHistoryEntry } from './focus-history-entry.entity';

const TODAY = '2026-10-23';
const NOON_UTC = Date.UTC(2026, 9, 23, 12, 0, 0);

function entry(overrides: Partial<FocusHistoryEntry> = {}): FocusHistoryEntry {
	return {
		mode: 'focus',
		outcome: 'completed',
		plannedMs: 1_500_000,
		elapsedMs: 1_500_000,
		endedAt: NOON_UTC,
		utcOffsetMinutes: 0,
		...overrides
	};
}

describe('summarizeDailyFocus', () => {
	it('is zero for an empty history', () => {
		expect(summarizeDailyFocus([], TODAY)).toEqual({ completedBlocks: 0, accumulatedMinutes: 0 });
	});

	it('counts today\u2019s completed focus blocks and adds their minutes', () => {
		const entries = [entry(), entry(), entry({ plannedMs: 3_000_000, elapsedMs: 3_000_000 })];

		expect(summarizeDailyFocus(entries, TODAY)).toEqual({
			completedBlocks: 3,
			accumulatedMinutes: 100
		});
	});

	it('rounds each entry\u2019s minutes like the old counter', () => {
		const entries = [entry({ plannedMs: 90_000 }), entry({ plannedMs: 30_000 })];

		expect(summarizeDailyFocus(entries, TODAY)).toEqual({
			completedBlocks: 2,
			accumulatedMinutes: 3
		});
		expect(summarizeDailyFocus([entry({ plannedMs: 29_999 })], TODAY)).toEqual({
			completedBlocks: 1,
			accumulatedMinutes: 0
		});
	});

	it('ignores skipped and abandoned focus blocks and every break', () => {
		const entries = [
			entry({ outcome: 'skipped', elapsedMs: 300_000 }),
			entry({ outcome: 'abandoned', elapsedMs: 600_000 }),
			entry({ mode: 'shortBreak', plannedMs: 300_000, elapsedMs: 300_000 }),
			entry({ mode: 'longBreak', plannedMs: 900_000, elapsedMs: 900_000 })
		];

		expect(summarizeDailyFocus(entries, TODAY)).toEqual({
			completedBlocks: 0,
			accumulatedMinutes: 0
		});
	});

	it('ignores entries of other days', () => {
		const entries = [
			entry({ endedAt: Date.UTC(2026, 9, 22, 12, 0, 0) }),
			entry({ endedAt: Date.UTC(2026, 9, 24, 12, 0, 0) }),
			entry()
		];

		expect(summarizeDailyFocus(entries, TODAY).completedBlocks).toBe(1);
	});

	it('attributes an entry to the day given by its stored offset, not the machine\u2019s', () => {
		// 23:50 local on the 23rd at UTC-03:00 is 02:50 UTC on the 24th.
		const lateNight = entry({ endedAt: Date.UTC(2026, 9, 24, 2, 50, 0), utcOffsetMinutes: -180 });
		// 00:10 local on the 24th at UTC+02:00 is 22:10 UTC on the 23rd.
		const justAfterMidnight = entry({
			endedAt: Date.UTC(2026, 9, 23, 22, 10, 0),
			utcOffsetMinutes: 120
		});

		expect(summarizeDailyFocus([lateNight, justAfterMidnight], TODAY).completedBlocks).toBe(1);
		expect(summarizeDailyFocus([lateNight, justAfterMidnight], '2026-10-24').completedBlocks).toBe(
			1
		);
	});

	it('counts migrated entries', () => {
		const entries = [entry({ migrated: true, plannedMs: 1_500_000 }), entry()];

		expect(summarizeDailyFocus(entries, TODAY)).toEqual({
			completedBlocks: 2,
			accumulatedMinutes: 50
		});
	});
});
