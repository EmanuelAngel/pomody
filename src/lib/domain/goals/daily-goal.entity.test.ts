import { describe, it, expect } from 'vitest';
import {
	MAX_DAILY_GOAL_MINUTES,
	applyGoalChange,
	goalForDate,
	sanitizeDailyGoalChange,
	validateDailyGoalChange,
	type DailyGoalChange
} from './daily-goal.entity';

function change(overrides: Partial<DailyGoalChange> = {}): DailyGoalChange {
	return { effectiveFrom: '2026-10-20', minutes: 120, restWeekdays: [6, 7], ...overrides };
}

describe('validateDailyGoalChange', () => {
	it('accepts a well-formed change and returns it frozen', () => {
		const result = validateDailyGoalChange(change());

		expect(result.ok).toBe(true);
		if (result.ok) {
			expect(result.change).toEqual(change());
			expect(Object.isFrozen(result.change)).toBe(true);
			expect(Object.isFrozen(result.change.restWeekdays)).toBe(true);
		}
	});

	it('sorts the rest weekdays', () => {
		const result = validateDailyGoalChange(change({ restWeekdays: [7, 1, 3] }));

		expect(result.ok && result.change.restWeekdays).toEqual([1, 3, 7]);
	});

	it('accepts the minutes boundaries 1 and the maximum, and no rest days', () => {
		expect(validateDailyGoalChange(change({ minutes: 1, restWeekdays: [] })).ok).toBe(true);
		expect(validateDailyGoalChange(change({ minutes: MAX_DAILY_GOAL_MINUTES })).ok).toBe(true);
	});

	it('accepts six rest days: at least one working day remains', () => {
		expect(validateDailyGoalChange(change({ restWeekdays: [1, 2, 3, 4, 5, 6] })).ok).toBe(true);
	});

	it.each([-1, 0.5, 90.2, MAX_DAILY_GOAL_MINUTES + 1, Number.NaN, Infinity])(
		'rejects %s minutes',
		(minutes) => {
			expect(validateDailyGoalChange(change({ minutes }))).toEqual({
				ok: false,
				reason: 'invalid_minutes'
			});
		}
	);

	it('rejects non-numeric minutes', () => {
		expect(validateDailyGoalChange({ ...change(), minutes: '120' })).toEqual({
			ok: false,
			reason: 'invalid_minutes'
		});
	});

	it.each([[[0]], [[8]], [[1.5]], [[1, 1]], [[1, 2, 3, 4, 5, 6, 7]]])(
		'rejects the rest weekdays %j',
		(restWeekdays) => {
			expect(validateDailyGoalChange(change({ restWeekdays }))).toEqual({
				ok: false,
				reason: 'invalid_rest_weekdays'
			});
		}
	);

	it('rejects rest weekdays that are not a list of numbers', () => {
		expect(validateDailyGoalChange({ ...change(), restWeekdays: 'sat' }).ok).toBe(false);
		expect(validateDailyGoalChange({ ...change(), restWeekdays: ['6'] }).ok).toBe(false);
	});

	it.each(['', '2026-10-2', '20261020', '2026-13-01', '2026-02-30', 'tomorrow'])(
		'rejects the date %j',
		(effectiveFrom) => {
			expect(validateDailyGoalChange(change({ effectiveFrom }))).toEqual({
				ok: false,
				reason: 'invalid_date'
			});
		}
	);

	it('accepts a leap day', () => {
		expect(validateDailyGoalChange(change({ effectiveFrom: '2028-02-29' })).ok).toBe(true);
	});

	it.each([null, undefined, 42, 'x', []])('rejects the non-object %j', (raw) => {
		expect(validateDailyGoalChange(raw).ok).toBe(false);
	});

	describe('goal removal (minutes = 0)', () => {
		it('accepts zero minutes and drops the rest weekdays, which mean nothing without a goal', () => {
			const result = validateDailyGoalChange(change({ minutes: 0, restWeekdays: [6, 7] }));

			expect(result.ok && result.change).toEqual({
				effectiveFrom: '2026-10-20',
				minutes: 0,
				restWeekdays: []
			});
		});
	});
});

describe('sanitizeDailyGoalChange', () => {
	it('returns the change when valid', () => {
		expect(sanitizeDailyGoalChange(change())).toEqual(change());
	});

	it('returns null when invalid', () => {
		expect(sanitizeDailyGoalChange(change({ minutes: -5 }))).toBeNull();
		expect(sanitizeDailyGoalChange('garbage')).toBeNull();
	});
});

describe('applyGoalChange', () => {
	it('adds the first change to an empty history', () => {
		expect(applyGoalChange([], change())).toEqual([change()]);
	});

	it('appends a later change and keeps the earlier one untouched', () => {
		const past = change({ effectiveFrom: '2026-10-20' });
		const later = change({ effectiveFrom: '2026-10-23', minutes: 90, restWeekdays: [7] });

		expect(applyGoalChange([past], later)).toEqual([past, later]);
	});

	it('replaces the entry of the same day instead of stacking another one', () => {
		const past = change({ effectiveFrom: '2026-10-20' });
		const today = change({ effectiveFrom: '2026-10-23', minutes: 60 });
		const edited = change({ effectiveFrom: '2026-10-23', minutes: 75, restWeekdays: [] });

		expect(applyGoalChange([past, today], edited)).toEqual([past, edited]);
	});

	it('keeps the history sorted by effective date when the change is not the newest', () => {
		const a = change({ effectiveFrom: '2026-10-10' });
		const c = change({ effectiveFrom: '2026-10-25' });
		const b = change({ effectiveFrom: '2026-10-20', minutes: 30 });

		expect(applyGoalChange([a, c], b).map((entry) => entry.effectiveFrom)).toEqual([
			'2026-10-10',
			'2026-10-20',
			'2026-10-25'
		]);
	});

	it('never mutates the input history or its entries', () => {
		const past = Object.freeze(change({ effectiveFrom: '2026-10-20' }));
		const history = Object.freeze([past]);

		const next = applyGoalChange(history, change({ effectiveFrom: '2026-10-23' }));

		expect(history).toEqual([past]);
		expect(next[0]).toBe(past);
		expect(next).not.toBe(history);
	});

	it('returns the history as it was when the change is invalid', () => {
		const history = [change()];

		expect(applyGoalChange(history, change({ minutes: 0.5 }))).toBe(history);
	});

	it('returns a frozen list', () => {
		expect(Object.isFrozen(applyGoalChange([], change()))).toBe(true);
	});
});

describe('goalForDate', () => {
	const first = change({ effectiveFrom: '2026-10-10', minutes: 60, restWeekdays: [7] });
	const second = change({ effectiveFrom: '2026-10-20', minutes: 120, restWeekdays: [6, 7] });
	const history = [first, second];

	it('is null before the first goal: those days are not evaluated', () => {
		expect(goalForDate(history, '2026-10-09')).toBeNull();
		expect(goalForDate([], '2026-10-09')).toBeNull();
	});

	it('uses a change from its own effective day', () => {
		expect(goalForDate(history, '2026-10-10')).toEqual(first);
		expect(goalForDate(history, '2026-10-20')).toEqual(second);
	});

	it('keeps the previous goal on the days between two changes', () => {
		expect(goalForDate(history, '2026-10-19')).toEqual(first);
		expect(goalForDate(history, '2026-10-15')).toEqual(first);
	});

	it('keeps the latest goal after the last change', () => {
		expect(goalForDate(history, '2027-01-01')).toEqual(second);
	});

	it('does not apply a change dated in the future', () => {
		expect(goalForDate(history, '2026-10-19')).toEqual(first);
	});

	it('is null on and after a goal removal, and the older goal still applies before it', () => {
		const removed = applyGoalChange(history, change({ effectiveFrom: '2026-10-25', minutes: 0 }));

		expect(goalForDate(removed, '2026-10-24')).toEqual(second);
		expect(goalForDate(removed, '2026-10-25')).toBeNull();
		expect(goalForDate(removed, '2026-11-30')).toBeNull();
	});

	it('is null for a malformed date key', () => {
		expect(goalForDate(history, 'not-a-date')).toBeNull();
	});
});
