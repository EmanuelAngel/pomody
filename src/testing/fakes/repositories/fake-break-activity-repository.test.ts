import { describe, it, expect } from 'vitest';
import { FakeBreakActivityRepository } from '$tests/fakes/repositories/fake-break-activity-repository';
import {
	createBreakActivity,
	PRESET_BREAK_ACTIVITIES
} from '$lib/domain/breaks/break-activity.entity';

describe('FakeBreakActivityRepository', () => {
	it('initializes with PRESET_BREAK_ACTIVITIES when undefined', async () => {
		const repo = new FakeBreakActivityRepository();
		const all = await repo.getAll();

		expect(all.length).toBe(PRESET_BREAK_ACTIVITIES.length);
		expect(all.every((act) => act.isPreset)).toBe(true);
	});

	it('initializes with empty array when [] is explicitly passed', async () => {
		const repo = new FakeBreakActivityRepository([]);
		expect(await repo.getAll()).toEqual([]);
	});

	it('initializes with custom activities and sorts them deterministically', async () => {
		const act1 = createBreakActivity({
			id: 'b-act',
			title: 'B Title',
			category: 'physical'
		});
		const act2 = createBreakActivity({
			id: 'a-act',
			title: 'A Title',
			category: 'physical'
		});
		const act3 = createBreakActivity({
			id: 'hydration-act',
			title: 'Drink Water',
			category: 'hydration'
		});

		const repo = new FakeBreakActivityRepository([act1, act2, act3]);
		const all = await repo.getAll();

		// Deterministic sort: category ascending (hydration < mindful < physical), then title, then id
		expect(all.map((a) => a.id)).toEqual(['hydration-act', 'a-act', 'b-act']);
	});

	it('filters activities by category', async () => {
		const repo = new FakeBreakActivityRepository();
		const physical = await repo.getByCategory('physical');
		const mindful = await repo.getByCategory('mindful');
		const hydration = await repo.getByCategory('hydration');

		expect(physical.every((a) => a.category === 'physical')).toBe(true);
		expect(mindful.every((a) => a.category === 'mindful')).toBe(true);
		expect(hydration.every((a) => a.category === 'hydration')).toBe(true);
		expect(physical.length + mindful.length + hydration.length).toBe(
			PRESET_BREAK_ACTIVITIES.length
		);
	});

	it('saves new activities and updates existing ones', async () => {
		const repo = new FakeBreakActivityRepository([]);
		const activity = createBreakActivity({
			id: 'custom-1',
			title: 'Deep Breath',
			category: 'mindful'
		});

		await repo.save(activity);
		expect(await repo.getAll()).toEqual([activity]);

		const updated = createBreakActivity({
			id: 'custom-1',
			title: 'Deeper Breath',
			category: 'mindful',
			durationMinutes: 4
		});
		await repo.save(updated);

		const all = await repo.getAll();
		expect(all).toHaveLength(1);
		expect(all[0].title).toBe('Deeper Breath');
		expect(all[0].durationMinutes).toBe(4);
	});

	it('deletes an activity by id', async () => {
		const repo = new FakeBreakActivityRepository();
		const initialCount = (await repo.getAll()).length;

		await repo.delete('preset-neck-shoulder-stretch');
		const afterDelete = await repo.getAll();

		expect(afterDelete.length).toBe(initialCount - 1);
		expect(afterDelete.find((a) => a.id === 'preset-neck-shoulder-stretch')).toBeUndefined();
	});

	it('resets catalog to preset activities via resetToDefaults()', async () => {
		const repo = new FakeBreakActivityRepository([]);
		const custom = createBreakActivity({
			id: 'custom-act',
			title: 'Custom Walk',
			category: 'physical'
		});
		await repo.save(custom);
		expect((await repo.getAll()).length).toBe(1);

		await repo.resetToDefaults();
		const resetAll = await repo.getAll();

		expect(resetAll.length).toBe(PRESET_BREAK_ACTIVITIES.length);
		expect(resetAll.find((a) => a.id === 'custom-act')).toBeUndefined();
	});

	it('clears all activities via clearAll()', async () => {
		const repo = new FakeBreakActivityRepository();
		await repo.clearAll();
		expect(await repo.getAll()).toEqual([]);
	});

	it('resets catalog to custom defaultActivities via resetToDefaults() when specified', async () => {
		const customDefault = createBreakActivity({
			id: 'default-custom',
			title: 'Custom Default Activity',
			category: 'physical'
		});
		const repo = new FakeBreakActivityRepository([], [customDefault]);
		expect(await repo.getAll()).toEqual([]);

		const temp = createBreakActivity({
			id: 'temp-act',
			title: 'Temp Walk',
			category: 'physical'
		});
		await repo.save(temp);
		expect((await repo.getAll()).length).toBe(1);

		await repo.resetToDefaults();
		const resetAll = await repo.getAll();

		expect(resetAll).toHaveLength(1);
		expect(resetAll[0].id).toBe('default-custom');
	});
});
