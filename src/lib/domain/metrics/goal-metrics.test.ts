import { describe, it, expect } from 'vitest';
import type { DailyGoalChange } from '$lib/domain/goals/daily-goal.entity';
import type { FocusHistoryEntry } from '$lib/domain/history/focus-history-entry.entity';
import { addDaysToKey } from './date-key';
import { goalStreak, todayGoalProgress, weekGoalAttainment } from './goal-metrics';

// 2026-10-23 is a Friday.
const MONDAY = '2026-10-19';
const TODAY = '2026-10-23';

function goal(
	effectiveFrom: string,
	minutes: number,
	restWeekdays: number[] = []
): DailyGoalChange {
	return { effectiveFrom, minutes, restWeekdays };
}

/** One completed focus block of `minutes` ending at noon local on `dateKey`. */
function focus(dateKey: string, minutes: number, utcOffsetMinutes = 0): FocusHistoryEntry {
	const [year, month, day] = dateKey.split('-').map(Number);
	return {
		mode: 'focus',
		outcome: 'completed',
		plannedMs: minutes * 60_000,
		elapsedMs: minutes * 60_000,
		endedAt: Date.UTC(year, month - 1, day, 12) - utcOffsetMinutes * 60_000,
		utcOffsetMinutes
	};
}

describe('todayGoalProgress', () => {
	it('is null when no goal is in force', () => {
		expect(todayGoalProgress([focus(TODAY, 25)], [], TODAY)).toBeNull();
		expect(todayGoalProgress([], [goal('2026-10-24', 60)], TODAY)).toBeNull();
		expect(
			todayGoalProgress([], [goal('2026-10-01', 60), goal('2026-10-20', 0)], TODAY)
		).toBeNull();
	});

	it('reports raw progress against the goal', () => {
		expect(todayGoalProgress([focus(TODAY, 75)], [goal('2026-10-01', 120)], TODAY)).toEqual({
			kind: 'active',
			goalMinutes: 120,
			minutes: 75,
			ratio: 0.625,
			met: false
		});
	});

	it('does not cap the ratio and marks the goal met at exactly the target', () => {
		const history = [goal('2026-10-01', 60)];

		expect(todayGoalProgress([focus(TODAY, 60)], history, TODAY)).toMatchObject({
			met: true,
			ratio: 1
		});
		expect(todayGoalProgress([focus(TODAY, 90)], history, TODAY)).toMatchObject({
			met: true,
			ratio: 1.5
		});
	});

	it('only adds completed focus of today', () => {
		const entries = [
			focus(TODAY, 25),
			focus('2026-10-22', 25),
			{ ...focus(TODAY, 25), outcome: 'skipped' as const },
			{ ...focus(TODAY, 25), mode: 'shortBreak' as const }
		];

		expect(todayGoalProgress(entries, [goal('2026-10-01', 60)], TODAY)).toMatchObject({
			minutes: 25
		});
	});

	it('returns the rest_day shape on a rest weekday, keeping the minutes worked', () => {
		const history = [goal('2026-10-01', 60, [5])];

		expect(todayGoalProgress([focus(TODAY, 30)], history, TODAY)).toEqual({
			kind: 'rest_day',
			minutes: 30
		});
	});
});

describe('weekGoalAttainment', () => {
	const history = [goal('2026-10-01', 60, [6, 7])];

	it('has no ratio when no day was evaluated', () => {
		expect(weekGoalAttainment([], [], MONDAY, TODAY)).toEqual({
			metDays: 0,
			evaluatedDays: 0,
			ratio: null
		});
		expect(weekGoalAttainment([], history, '2026-10-26', TODAY)).toEqual({
			metDays: 0,
			evaluatedDays: 0,
			ratio: null
		});
	});

	it('counts met days over evaluated working days of a finished week', () => {
		const entries = [
			focus('2026-10-12', 60),
			focus('2026-10-13', 60),
			focus('2026-10-14', 59),
			focus('2026-10-15', 120)
		];

		expect(weekGoalAttainment(entries, history, '2026-10-12', TODAY)).toEqual({
			metDays: 3,
			evaluatedDays: 5,
			ratio: 0.6
		});
	});

	it('skips rest days even when work was done on them', () => {
		const entries = [focus('2026-10-17', 600), focus('2026-10-18', 600)];

		expect(weekGoalAttainment(entries, history, '2026-10-12', TODAY).evaluatedDays).toBe(5);
	});

	it('does not evaluate days after today', () => {
		const entries = [focus('2026-10-19', 60), focus('2026-10-20', 60)];

		expect(weekGoalAttainment(entries, history, MONDAY, '2026-10-21')).toEqual({
			metDays: 2,
			evaluatedDays: 2, // Wednesday is today and unmet, so it is not counted yet
			ratio: 1
		});
	});

	it('does not lower the percentage with an unmet today, but counts a met one', () => {
		const earlier = [
			focus('2026-10-19', 60),
			focus('2026-10-20', 60),
			focus('2026-10-21', 60),
			focus('2026-10-22', 60)
		];

		expect(weekGoalAttainment(earlier, history, MONDAY, TODAY)).toEqual({
			metDays: 4,
			evaluatedDays: 4,
			ratio: 1
		});
		expect(weekGoalAttainment([...earlier, focus(TODAY, 60)], history, MONDAY, TODAY)).toEqual({
			metDays: 5,
			evaluatedDays: 5,
			ratio: 1
		});
	});

	it('judges each day by the goal in force that day', () => {
		const changed = [goal('2026-10-01', 30), goal('2026-10-21', 90)];
		const entries = [
			focus('2026-10-19', 30),
			focus('2026-10-20', 30),
			focus('2026-10-21', 60), // fails the new 90
			focus('2026-10-22', 90)
		];

		expect(weekGoalAttainment(entries, changed, MONDAY, TODAY)).toEqual({
			metDays: 3,
			evaluatedDays: 4,
			ratio: 0.75
		});
	});

	it('does not evaluate days before the first goal or after its removal', () => {
		const partial = [goal('2026-10-21', 30), goal('2026-10-23', 0)];
		const entries = [focus('2026-10-21', 30)];

		expect(weekGoalAttainment(entries, partial, MONDAY, '2026-10-25')).toEqual({
			metDays: 1,
			evaluatedDays: 2,
			ratio: 0.5
		});
	});

	it('uses the stored offset to place minutes on a day', () => {
		// 23:50 local on the 19th at -03:00 is already the 20th in UTC.
		const late = { ...focus('2026-10-19', 60, -180), endedAt: Date.UTC(2026, 9, 20, 2, 50) };

		expect(weekGoalAttainment([late], history, MONDAY, '2026-10-19')).toEqual({
			metDays: 1,
			evaluatedDays: 1,
			ratio: 1
		});
	});
});

describe('goalStreak', () => {
	const history = [goal('2026-10-01', 60, [6, 7])];

	it('is 0 without goal or without entries', () => {
		expect(goalStreak([focus(TODAY, 60)], [], TODAY)).toBe(0);
		expect(goalStreak([], history, TODAY)).toBe(0);
	});

	it('counts consecutive met days up to a missed one', () => {
		const entries = [focus('2026-10-22', 60), focus('2026-10-21', 60), focus('2026-10-19', 60)];

		expect(goalStreak(entries, history, TODAY)).toBe(2);
	});

	it('counts a met today', () => {
		const entries = [focus(TODAY, 60), focus('2026-10-22', 60)];

		expect(goalStreak(entries, history, TODAY)).toBe(2);
	});

	it('does not break on an unmet today, and does not count it', () => {
		const entries = [focus(TODAY, 10), focus('2026-10-22', 60), focus('2026-10-21', 60)];

		expect(goalStreak(entries, history, TODAY)).toBe(2);
	});

	it('skips rest days without counting or breaking', () => {
		// Saturday and Sunday are rest days; Friday the 23rd and Thursday the 22nd were met.
		const entries = [focus('2026-10-26', 60), focus('2026-10-23', 60), focus('2026-10-22', 60)];

		expect(goalStreak(entries, history, '2026-10-26')).toBe(3);
		// Today itself being a rest day neither counts nor breaks.
		expect(goalStreak(entries, history, '2026-10-25')).toBe(2);
	});

	it('does not count work done on a rest day', () => {
		const entries = [focus('2026-10-24', 600), focus('2026-10-23', 60)];

		expect(goalStreak(entries, history, '2026-10-24')).toBe(1);
	});

	it('ends at a day with no goal, before the first goal', () => {
		const late = [goal('2026-10-21', 60)];
		const entries = [
			focus(TODAY, 60),
			focus('2026-10-22', 60),
			focus('2026-10-21', 60),
			focus('2026-10-20', 60)
		];

		expect(goalStreak(entries, late, TODAY)).toBe(3);
	});

	it('ends at a day covered by a removal', () => {
		const removed = [goal('2026-10-01', 60), goal('2026-10-21', 0), goal('2026-10-22', 60)];
		const entries = [
			focus(TODAY, 60),
			focus('2026-10-22', 60),
			focus('2026-10-21', 600),
			focus('2026-10-20', 60)
		];

		expect(goalStreak(entries, removed, TODAY)).toBe(2);
	});

	it('evaluates each past day with the goal in force then', () => {
		const changed = [goal('2026-10-01', 30), goal('2026-10-22', 90)];
		const entries = [
			focus(TODAY, 90),
			focus('2026-10-22', 90),
			focus('2026-10-21', 30),
			focus('2026-10-20', 30)
		];

		expect(goalStreak(entries, changed, TODAY)).toBe(4);
		expect(goalStreak([focus('2026-10-22', 30), focus('2026-10-21', 30)], changed, TODAY)).toBe(0);
	});

	it('survives 365 days of data in a single pass', () => {
		const first = addDaysToKey(TODAY, -364);
		const entries = Array.from({ length: 365 }, (_, index) =>
			focus(addDaysToKey(first, index), 60)
		);

		expect(goalStreak(entries, [goal(first, 60)], TODAY)).toBe(365);
		// Same 365 days, but Saturdays and Sundays are rest days: 261 working days remain.
		expect(goalStreak(entries, [goal(first, 60, [6, 7])], TODAY)).toBe(261);
	});
});
