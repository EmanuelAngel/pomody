import { describe, expect, it } from 'vitest';
import {
	createBreakActivityFixture,
	createBreakActivityListFixture
} from '$tests/fixtures/break-activity.fixture';

describe('break-activity.fixture', () => {
	it('should create a break activity with default values', () => {
		const activity = createBreakActivityFixture();

		expect(activity).toEqual({
			id: 'break-fixture-1',
			title: 'Desk Stretch',
			category: 'physical',
			durationMinutes: 5,
			isPreset: false,
			guide: 'Stretch neck and shoulders gently.'
		});
		expect(Object.isFrozen(activity)).toBe(true);
	});

	it('should apply partial overrides to break activity', () => {
		const activity = createBreakActivityFixture({
			id: 'custom-break',
			title: 'Mindful Breathing',
			category: 'mindful',
			durationMinutes: 3,
			isPreset: true,
			guide: 'Breathe in for 4s, out for 4s.'
		});

		expect(activity).toEqual({
			id: 'custom-break',
			title: 'Mindful Breathing',
			category: 'mindful',
			durationMinutes: 3,
			isPreset: true,
			guide: 'Breathe in for 4s, out for 4s.'
		});
		expect(Object.isFrozen(activity)).toBe(true);
	});

	it('should generate an immutable list of break activities with sequential IDs', () => {
		const activities = createBreakActivityListFixture(3);

		expect(activities).toHaveLength(3);
		expect(Object.isFrozen(activities)).toBe(true);

		expect(activities[0].id).toBe('break-fixture-1');
		expect(activities[1].id).toBe('break-fixture-2');
		expect(activities[2].id).toBe('break-fixture-3');

		for (const activity of activities) {
			expect(Object.isFrozen(activity)).toBe(true);
			expect(activity.category).toBe('physical');
			expect(activity.durationMinutes).toBe(5);
		}
	});

	it('should apply baseOverrides and namespace IDs in break activity lists', () => {
		const single = createBreakActivityListFixture(1, {
			id: 'unique-break',
			category: 'hydration'
		});
		expect(single[0].id).toBe('unique-break');
		expect(single[0].category).toBe('hydration');

		const multiple = createBreakActivityListFixture(2, {
			id: 'calm',
			category: 'mindful'
		});
		expect(multiple[0].id).toBe('calm-1');
		expect(multiple[0].category).toBe('mindful');
		expect(multiple[1].id).toBe('calm-2');
		expect(multiple[1].category).toBe('mindful');
	});

	it('should return empty frozen array when count is 0', () => {
		const activities = createBreakActivityListFixture(0);
		expect(activities).toEqual([]);
		expect(Object.isFrozen(activities)).toBe(true);
	});
});
