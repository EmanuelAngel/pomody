import { describe, it, expect } from 'vitest';
import type { FocusHistoryEntry } from '$lib/domain/history/focus-history-entry.entity';
import {
	focusCompliance,
	hourlyFocusMinutes,
	weekTotal,
	weeklyFocusCompliance,
	weeklyFocusMinutes
} from './focus-aggregations';

const MONDAY = '2026-10-19';
const TODAY = '2026-10-23';

/** Entry ending at `hh:mm` local on `dateKey`, recorded with the given UTC offset. */
function at(
	dateKey: string,
	time: string,
	overrides: Partial<FocusHistoryEntry> = {},
	utcOffsetMinutes = 0
): FocusHistoryEntry {
	const [year, month, day] = dateKey.split('-').map(Number);
	const [hours, minutes] = time.split(':').map(Number);
	return {
		mode: 'focus',
		outcome: 'completed',
		plannedMs: 1_500_000,
		elapsedMs: 1_500_000,
		endedAt: Date.UTC(year, month - 1, day, hours, minutes) - utcOffsetMinutes * 60_000,
		utcOffsetMinutes,
		...overrides
	};
}

describe('weeklyFocusMinutes', () => {
	it('returns seven zeroed days, Monday to Sunday, for an empty history', () => {
		const week = weeklyFocusMinutes([], MONDAY);

		expect(week.map((day) => day.dateKey)).toEqual([
			'2026-10-19',
			'2026-10-20',
			'2026-10-21',
			'2026-10-22',
			'2026-10-23',
			'2026-10-24',
			'2026-10-25'
		]);
		expect(week.every((day) => day.minutes === 0 && day.blocks === 0)).toBe(true);
	});

	it('adds minutes and blocks to the day of each completed focus entry', () => {
		const week = weeklyFocusMinutes(
			[at('2026-10-19', '09:00'), at('2026-10-19', '10:00'), at('2026-10-25', '23:59')],
			MONDAY
		);

		expect(week[0]).toEqual({ dateKey: '2026-10-19', minutes: 50, blocks: 2 });
		expect(week[6]).toEqual({ dateKey: '2026-10-25', minutes: 25, blocks: 1 });
		expect(weekTotal(week)).toEqual({ minutes: 75, blocks: 3 });
	});

	it('ignores breaks, skipped and abandoned blocks and other weeks', () => {
		const week = weeklyFocusMinutes(
			[
				at('2026-10-20', '09:00', { mode: 'shortBreak' }),
				at('2026-10-20', '09:00', { mode: 'longBreak' }),
				at('2026-10-20', '09:00', { outcome: 'skipped' }),
				at('2026-10-20', '09:00', { outcome: 'abandoned' }),
				at('2026-10-18', '23:59'),
				at('2026-10-26', '00:00')
			],
			MONDAY
		);

		expect(weekTotal(week)).toEqual({ minutes: 0, blocks: 0 });
	});

	it('counts migrated entries', () => {
		const week = weeklyFocusMinutes([at('2026-10-21', '12:00', { migrated: true })], MONDAY);

		expect(week[2]).toEqual({ dateKey: '2026-10-21', minutes: 25, blocks: 1 });
	});

	it('rounds each entry like the footer counter', () => {
		const week = weeklyFocusMinutes(
			[
				at('2026-10-19', '09:00', { plannedMs: 90_000 }),
				at('2026-10-19', '10:00', { plannedMs: 29_999 })
			],
			MONDAY
		);

		expect(week[0]).toEqual({ dateKey: '2026-10-19', minutes: 2, blocks: 2 });
	});

	it('uses the stored offset, not the machine timezone', () => {
		// 23:50 local on Sunday the 25th at +09:00 is 14:50 UTC the same day;
		// 23:50 local at -03:00 is 02:50 UTC on Monday the 26th.
		const tokyo = at('2026-10-25', '23:50', {}, 540);
		const buenosAires = at('2026-10-25', '23:50', {}, -180);

		expect(new Date(buenosAires.endedAt).getUTCDate()).toBe(26);
		expect(weeklyFocusMinutes([tokyo, buenosAires], MONDAY)[6].blocks).toBe(2);
		expect(weeklyFocusMinutes([tokyo, buenosAires], '2026-10-26')[0].blocks).toBe(0);
	});

	it('normalises any day of the week to its Monday', () => {
		expect(weeklyFocusMinutes([], '2026-10-23')[0].dateKey).toBe(MONDAY);
	});
});

describe('hourlyFocusMinutes', () => {
	it('returns 24 empty buckets for an empty history', () => {
		expect(hourlyFocusMinutes([], TODAY)).toEqual(new Array(24).fill(0));
	});

	it('adds completed focus minutes to the local hour of each entry', () => {
		const buckets = hourlyFocusMinutes(
			[at('2026-10-23', '09:05'), at('2026-10-10', '09:55'), at('2026-10-22', '23:59')],
			TODAY
		);

		expect(buckets).toHaveLength(24);
		expect(buckets[9]).toBe(50);
		expect(buckets[23]).toBe(25);
		expect(buckets.reduce((a, b) => a + b, 0)).toBe(75);
	});

	it('uses the stored offset for the hour', () => {
		const buckets = hourlyFocusMinutes([at('2026-10-23', '23:50', {}, -180)], TODAY);

		expect(buckets[23]).toBe(25);
	});

	it('includes the 29th day back and excludes the 30th', () => {
		const included = at('2026-09-24', '08:00'); // 29 days before 2026-10-23
		const excluded = at('2026-09-23', '08:00'); // 30 days before

		expect(hourlyFocusMinutes([included, excluded], TODAY)[8]).toBe(25);
		expect(hourlyFocusMinutes([excluded], TODAY)[8]).toBe(0);
	});

	it('ignores days after today', () => {
		expect(hourlyFocusMinutes([at('2026-10-24', '08:00')], TODAY)[8]).toBe(0);
	});

	it('excludes migrated entries, breaks and partial blocks', () => {
		const buckets = hourlyFocusMinutes(
			[
				at('2026-10-23', '08:00', { migrated: true }),
				at('2026-10-23', '08:00', { mode: 'shortBreak' }),
				at('2026-10-23', '08:00', { outcome: 'skipped' }),
				at('2026-10-23', '08:00', { outcome: 'abandoned' })
			],
			TODAY
		);

		expect(buckets).toEqual(new Array(24).fill(0));
	});
});

describe('focusCompliance', () => {
	it('is null when nothing was started', () => {
		expect(focusCompliance([], MONDAY, '2026-10-25')).toEqual({
			completed: 0,
			started: 0,
			ratio: null
		});
	});

	it('is completed over started, counting abandoned and warm skips but not cold skips', () => {
		const entries = [
			at('2026-10-19', '09:00'),
			at('2026-10-19', '10:00'),
			at('2026-10-20', '09:00', { outcome: 'skipped', elapsedMs: 300_000 }),
			at('2026-10-20', '10:00', { outcome: 'abandoned', elapsedMs: 120_000 }),
			at('2026-10-20', '11:00', { outcome: 'skipped', elapsedMs: 0 })
		];

		expect(focusCompliance(entries, MONDAY, '2026-10-25')).toEqual({
			completed: 2,
			started: 4,
			ratio: 0.5
		});
	});

	it('counts an abandoned block even if no time had elapsed', () => {
		const entries = [at('2026-10-19', '09:00', { outcome: 'abandoned', elapsedMs: 0 })];

		expect(focusCompliance(entries, MONDAY, '2026-10-25')).toEqual({
			completed: 0,
			started: 1,
			ratio: 0
		});
	});

	it('leaves breaks out entirely', () => {
		const entries = [
			at('2026-10-19', '09:00', { mode: 'shortBreak' }),
			at('2026-10-19', '09:30', { mode: 'longBreak', outcome: 'abandoned', elapsedMs: 10_000 }),
			at('2026-10-19', '10:00', { mode: 'shortBreak', outcome: 'skipped', elapsedMs: 10_000 })
		];

		expect(focusCompliance(entries, MONDAY, '2026-10-25').ratio).toBeNull();
	});

	it('counts migrated completions as completed', () => {
		const entries = [at('2026-10-19', '09:00', { migrated: true })];

		expect(focusCompliance(entries, MONDAY, '2026-10-25')).toEqual({
			completed: 1,
			started: 1,
			ratio: 1
		});
	});

	it('only looks at the inclusive range', () => {
		const entries = [
			at('2026-10-18', '23:59'),
			at('2026-10-19', '00:00'),
			at('2026-10-25', '23:59'),
			at('2026-10-26', '00:00', { outcome: 'abandoned' })
		];

		expect(focusCompliance(entries, MONDAY, '2026-10-25')).toEqual({
			completed: 2,
			started: 2,
			ratio: 1
		});
	});

	it('weeklyFocusCompliance covers Monday to Sunday of the selected week', () => {
		const entries = [
			at('2026-10-25', '23:59'),
			at('2026-10-26', '00:01', { outcome: 'abandoned' }),
			at('2026-10-18', '23:59', { outcome: 'abandoned' })
		];

		expect(weeklyFocusCompliance(entries, '2026-10-23')).toEqual({
			completed: 1,
			started: 1,
			ratio: 1
		});
	});
});
