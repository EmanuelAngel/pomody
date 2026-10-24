import { describe, it, expect } from 'vitest';
import { addDaysToKey, isoWeekdayOfKey, shiftWeek, weekDayKeys, weekStartKey } from './date-key';

describe('weekStartKey', () => {
	it.each([
		['2026-10-19', '2026-10-19'], // Monday
		['2026-10-20', '2026-10-19'],
		['2026-10-21', '2026-10-19'],
		['2026-10-22', '2026-10-19'],
		['2026-10-23', '2026-10-19'], // Friday
		['2026-10-24', '2026-10-19'],
		['2026-10-25', '2026-10-19'] // Sunday belongs to the week that started the Monday before
	])('maps %s to the Monday %s', (day, monday) => {
		expect(weekStartKey(day)).toBe(monday);
	});

	it('crosses month and year boundaries', () => {
		expect(weekStartKey('2026-11-01')).toBe('2026-10-26'); // Sunday
		expect(weekStartKey('2027-01-01')).toBe('2026-12-28'); // Friday
		expect(weekStartKey('2024-01-01')).toBe('2024-01-01'); // Monday
	});

	it('handles the leap day', () => {
		expect(weekStartKey('2024-02-29')).toBe('2024-02-26'); // Thursday
		expect(weekStartKey('2024-03-03')).toBe('2024-02-26'); // Sunday
		expect(weekStartKey('2024-03-01')).toBe('2024-02-26');
	});
});

describe('shiftWeek', () => {
	it('moves by whole weeks in both directions', () => {
		expect(shiftWeek('2026-10-19', 0)).toBe('2026-10-19');
		expect(shiftWeek('2026-10-19', -1)).toBe('2026-10-12');
		expect(shiftWeek('2026-10-19', 1)).toBe('2026-10-26');
	});

	it('is calendar based across a DST change and a year boundary', () => {
		expect(shiftWeek('2026-10-26', 1)).toBe('2026-11-02');
		expect(shiftWeek('2026-03-23', 1)).toBe('2026-03-30');
		expect(shiftWeek('2026-12-28', 1)).toBe('2027-01-04');
		expect(shiftWeek('2024-03-04', -1)).toBe('2024-02-26');
	});
});

describe('addDaysToKey / isoWeekdayOfKey / weekDayKeys', () => {
	it('adds days across months, years and the leap day', () => {
		expect(addDaysToKey('2026-10-31', 1)).toBe('2026-11-01');
		expect(addDaysToKey('2026-01-01', -1)).toBe('2025-12-31');
		expect(addDaysToKey('2024-02-28', 1)).toBe('2024-02-29');
		expect(addDaysToKey('2025-02-28', 1)).toBe('2025-03-01');
		expect(addDaysToKey('2026-10-23', -29)).toBe('2026-09-24');
	});

	it('numbers weekdays 1 = Monday to 7 = Sunday', () => {
		expect(isoWeekdayOfKey('2026-10-19')).toBe(1);
		expect(isoWeekdayOfKey('2026-10-24')).toBe(6);
		expect(isoWeekdayOfKey('2026-10-25')).toBe(7);
	});

	it('lists the seven days of a week, Monday first', () => {
		expect(weekDayKeys('2026-10-26')).toEqual([
			'2026-10-26',
			'2026-10-27',
			'2026-10-28',
			'2026-10-29',
			'2026-10-30',
			'2026-10-31',
			'2026-11-01'
		]);
	});
});
