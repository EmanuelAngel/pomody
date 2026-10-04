import { describe, it, expect } from 'vitest';
import { FakeBreakActivityRepository } from '$tests/fakes/repositories/fake-break-activity-repository';
import { createBreakActivity, PRESET_BREAK_ACTIVITIES } from '../breaks/break-activity.entity';
import {
	compareBreakActivities,
	sortBreakActivities,
	type IBreakActivityRepository
} from './break-activity-repository.port';

describe('Break Activity Repository Port & Sorting Utilities', () => {
	describe('compareBreakActivities', () => {
		it('should sort primarily by category ascending when categories differ', () => {
			const hydration = createBreakActivity({
				id: 'act-1',
				title: 'Water Drink',
				category: 'hydration'
			});
			const mindful = createBreakActivity({
				id: 'act-2',
				title: 'Breathing',
				category: 'mindful'
			});
			const physical = createBreakActivity({
				id: 'act-3',
				title: 'Stretching',
				category: 'physical'
			});

			// 'hydration' < 'mindful' < 'physical'
			expect(compareBreakActivities(hydration, mindful)).toBeLessThan(0);
			expect(compareBreakActivities(mindful, hydration)).toBeGreaterThan(0);
			expect(compareBreakActivities(mindful, physical)).toBeLessThan(0);
			expect(compareBreakActivities(physical, mindful)).toBeGreaterThan(0);
		});

		it('should break ties using title localeCompare ascending when categories are identical', () => {
			const actAlpha = createBreakActivity({
				id: 'act-2',
				title: 'Alpha Stretch',
				category: 'physical'
			});
			const actZeta = createBreakActivity({
				id: 'act-1',
				title: 'Zeta Stretch',
				category: 'physical'
			});

			expect(compareBreakActivities(actAlpha, actZeta)).toBeLessThan(0);
			expect(compareBreakActivities(actZeta, actAlpha)).toBeGreaterThan(0);
		});

		it('should break ties using id ascending when both category and title are identical', () => {
			const actId1 = createBreakActivity({
				id: 'break-a',
				title: 'Same Title',
				category: 'mindful'
			});
			const actId2 = createBreakActivity({
				id: 'break-b',
				title: 'Same Title',
				category: 'mindful'
			});

			expect(compareBreakActivities(actId1, actId2)).toBeLessThan(0);
			expect(compareBreakActivities(actId2, actId1)).toBeGreaterThan(0);
		});

		it('should return 0 when category, title, and id are identical', () => {
			const act1 = createBreakActivity({
				id: 'same-id',
				title: 'Identical Activity',
				category: 'hydration'
			});
			const act2 = createBreakActivity({
				id: 'same-id',
				title: 'Identical Activity',
				category: 'hydration'
			});

			expect(compareBreakActivities(act1, act2)).toBe(0);
		});
	});

	describe('sortBreakActivities', () => {
		it('should sort a collection deterministically by category, then title, then id', () => {
			const actPhysicalB = createBreakActivity({
				id: 'p-2',
				title: 'Shoulder Roll',
				category: 'physical'
			});
			const actPhysicalA = createBreakActivity({
				id: 'p-1',
				title: 'Arm Stretch',
				category: 'physical'
			});
			const actMindful = createBreakActivity({
				id: 'm-1',
				title: 'Box Breathing',
				category: 'mindful'
			});
			const actHydration = createBreakActivity({
				id: 'h-1',
				title: 'Fresh Water',
				category: 'hydration'
			});

			const unsorted = [actPhysicalB, actMindful, actPhysicalA, actHydration];
			const sorted = sortBreakActivities(unsorted);

			expect(sorted.map((a) => a.id)).toEqual(['h-1', 'm-1', 'p-1', 'p-2']);
		});

		it('should return a frozen array to preserve immutability', () => {
			const act = createBreakActivity({
				id: 'act-1',
				title: 'Quick Rest',
				category: 'mindful'
			});
			const sorted = sortBreakActivities([act]);

			expect(Object.isFrozen(sorted)).toBe(true);
			// @ts-expect-error verifying mutation is forbidden at compile-time and throws at runtime
			expect(() => sorted.push(act)).toThrow();
		});

		it('should not mutate the input array', () => {
			const act1 = createBreakActivity({ id: 'z', title: 'Zebra', category: 'physical' });
			const act2 = createBreakActivity({ id: 'a', title: 'Apple', category: 'physical' });
			const original = [act1, act2];

			sortBreakActivities(original);

			expect(original[0].title).toBe('Zebra');
			expect(original[1].title).toBe('Apple');
		});

		it('should handle empty array cleanly', () => {
			const sorted = sortBreakActivities([]);

			expect(sorted).toEqual([]);
			expect(Object.isFrozen(sorted)).toBe(true);
		});

		it('should handle single item array correctly', () => {
			const act = createBreakActivity({
				id: 'single',
				title: 'Only Activity',
				category: 'hydration'
			});
			const sorted = sortBreakActivities([act]);

			expect(sorted).toHaveLength(1);
			expect(sorted[0]).toBe(act);
			expect(Object.isFrozen(sorted)).toBe(true);
		});
	});

	describe('IBreakActivityRepository contract compilation & in-memory behavior', () => {
		it('should satisfy the IBreakActivityRepository contract across all operations', async () => {
			const repo: IBreakActivityRepository = new FakeBreakActivityRepository();

			// Initial state with defaults
			const initial = await repo.getAll();
			expect(initial).toHaveLength(PRESET_BREAK_ACTIVITIES.length);

			// getByCategory
			const physicals = await repo.getByCategory('physical');
			expect(physicals.length).toBeGreaterThan(0);
			expect(physicals.every((p) => p.category === 'physical')).toBe(true);

			// Save new activity
			const custom = createBreakActivity({
				id: 'custom-1',
				title: 'Calisthenics Pushups',
				category: 'physical',
				durationMinutes: 5,
				isPreset: false
			});
			await repo.save(custom);
			expect((await repo.getAll()).some((a) => a.id === 'custom-1')).toBe(true);

			// Update existing activity
			const updatedCustom = createBreakActivity({
				id: 'custom-1',
				title: 'Calisthenics Gentle Pushups',
				category: 'physical',
				durationMinutes: 4,
				isPreset: false
			});
			await repo.save(updatedCustom);
			const saved = (await repo.getAll()).find((a) => a.id === 'custom-1');
			expect(saved?.title).toBe('Calisthenics Gentle Pushups');
			expect(saved?.durationMinutes).toBe(4);

			// Delete activity
			await repo.delete('custom-1');
			expect((await repo.getAll()).some((a) => a.id === 'custom-1')).toBe(false);

			// Clear all
			await repo.clearAll();
			expect(await repo.getAll()).toEqual([]);

			// Reset to defaults
			await repo.resetToDefaults();
			const resetActivities = await repo.getAll();
			expect(resetActivities).toHaveLength(PRESET_BREAK_ACTIVITIES.length);
		});
	});
});
