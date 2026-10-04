import { describe, it, expect, beforeEach } from 'vitest';
import { FakeBreakActivityRepository } from '$tests/fakes/repositories/fake-break-activity-repository';
import { BreaksState, createBreaksState, breaksState } from './breaks.svelte';
import { createBreakActivity, type BreakActivity } from '../domain/breaks/break-activity.entity';
import { sortBreakActivities } from '../domain/ports/break-activity-repository.port';

describe('BreaksState', () => {
	const sampleActivities: readonly BreakActivity[] = [
		createBreakActivity({
			id: 'act-1',
			title: 'Neck Stretch',
			category: 'physical',
			durationMinutes: 2
		}),
		createBreakActivity({
			id: 'act-2',
			title: 'Deep Breathing',
			category: 'mindful',
			durationMinutes: 3
		}),
		createBreakActivity({
			id: 'act-3',
			title: 'Drink Water',
			category: 'hydration',
			durationMinutes: 1
		})
	];

	let repo: FakeBreakActivityRepository;
	let state: BreaksState;

	beforeEach(() => {
		repo = new FakeBreakActivityRepository(sampleActivities);
		state = createBreaksState(repo);
	});

	it('should initialize with default empty state', () => {
		expect(state.activities).toEqual([]);
		expect(state.activeActivity).toBeNull();
		expect(state.currentBreakCycle).toBeNull();
		expect(state.isLoading).toBe(false);
		expect(state.isLoaded).toBe(false);
	});

	it('should load activities from repository and update loaded flags', async () => {
		await state.load();

		expect(state.isLoaded).toBe(true);
		expect(state.isLoading).toBe(false);
		expect(state.activities).toHaveLength(3);
		// Activities should be sorted deterministically by category, title, id
		expect(state.activities.map((a) => a.id)).toEqual(
			sortBreakActivities(sampleActivities).map((a) => a.id)
		);
	});

	it('should suggest an activity for a break cycle when activities are loaded', async () => {
		await state.load();

		const suggested = state.suggestForBreak('cycle-round-1');

		expect(suggested).not.toBeNull();
		expect(state.activeActivity).toBe(suggested);
		expect(state.currentBreakCycle).toBe('cycle-round-1');
		expect(sampleActivities.some((a) => a.id === suggested?.id)).toBe(true);
	});

	it('should maintain tab switch stability: consecutive calls with same cycleKey return identical activeActivity', async () => {
		await state.load();

		const firstSuggestion = state.suggestForBreak('cycle-round-1');
		expect(firstSuggestion).not.toBeNull();

		// Simulate tab switching or re-renders within the same break cycle
		const secondSuggestion = state.suggestForBreak('cycle-round-1');
		const thirdSuggestion = state.suggestForBreak('cycle-round-1');

		expect(secondSuggestion).toBe(firstSuggestion);
		expect(thirdSuggestion).toBe(firstSuggestion);
		expect(state.activeActivity).toBe(firstSuggestion);
		expect(state.currentBreakCycle).toBe('cycle-round-1');
	});

	it('should pick a different activity on cycle change (avoids previousId)', async () => {
		await state.load();

		const firstActivity = state.suggestForBreak('cycle-round-1');
		expect(firstActivity).not.toBeNull();

		// Move to the next break cycle
		const secondActivity = state.suggestForBreak('cycle-round-2');
		expect(secondActivity).not.toBeNull();
		expect(state.currentBreakCycle).toBe('cycle-round-2');
		expect(secondActivity?.id).not.toBe(firstActivity?.id);
		expect(state.activeActivity?.id).toBe(secondActivity?.id);
	});

	it('should force a different activity on shuffle even within the same cycle', async () => {
		await state.load();

		const initialActivity = state.suggestForBreak('cycle-round-1');
		expect(initialActivity).not.toBeNull();

		const shuffledActivity = state.shuffle();
		expect(shuffledActivity).not.toBeNull();
		expect(shuffledActivity?.id).not.toBe(initialActivity?.id);
		expect(state.activeActivity?.id).toBe(shuffledActivity?.id);
		// Cycle key is preserved
		expect(state.currentBreakCycle).toBe('cycle-round-1');

		// Subsequent suggestForBreak calls with same cycleKey now retain the shuffled activity
		const callAfterShuffle = state.suggestForBreak('cycle-round-1');
		expect(callAfterShuffle).toBe(shuffledActivity);
	});

	it('should clear active cycle on resetCycle', async () => {
		await state.load();

		state.suggestForBreak('cycle-round-1');
		expect(state.currentBreakCycle).toBe('cycle-round-1');

		state.resetCycle();
		expect(state.currentBreakCycle).toBeNull();

		// After reset, calling suggestForBreak with 'cycle-round-1' triggers a new suggestion
		const newActivity = state.suggestForBreak('cycle-round-1');
		expect(newActivity).not.toBeNull();
		expect(state.currentBreakCycle).toBe('cycle-round-1');
	});

	it('should return null when activities list is empty', async () => {
		const emptyRepo = new FakeBreakActivityRepository([]);
		const emptyState = createBreaksState(emptyRepo);
		await emptyState.load();

		expect(emptyState.activities).toEqual([]);

		const suggested = emptyState.suggestForBreak('cycle-round-1');
		expect(suggested).toBeNull();
		expect(emptyState.activeActivity).toBeNull();
		expect(emptyState.currentBreakCycle).toBe('cycle-round-1');

		const shuffled = emptyState.shuffle();
		expect(shuffled).toBeNull();
		expect(emptyState.activeActivity).toBeNull();
	});

	it('should filter candidate activities by maxDurationMinutes', async () => {
		await state.load();

		// Only act-3 has duration 1 min
		const suggested = state.suggestForBreak('cycle-short', 1);
		expect(suggested).not.toBeNull();
		expect(suggested?.id).toBe('act-3');
		expect(suggested?.durationMinutes).toBeLessThanOrEqual(1);

		// If duration limit is too small to match any activity, returns null
		const noMatch = state.shuffle(0);
		expect(noMatch).toBeNull();
	});

	it('should handle single activity in catalog gracefully during shuffle', async () => {
		const single = [sampleActivities[0]];
		const singleRepo = new FakeBreakActivityRepository(single);
		const singleState = createBreaksState(singleRepo);
		await singleState.load();

		const first = singleState.suggestForBreak('cycle-single');
		expect(first?.id).toBe(single[0].id);

		// Shuffling when there is only 1 candidate falls back to that single activity
		const shuffled = singleState.shuffle();
		expect(shuffled?.id).toBe(single[0].id);
	});

	it('should sync activeActivity on load if repository updates the activity', async () => {
		await state.load();
		state.suggestForBreak('cycle-1');
		const activeId = state.activeActivity!.id;

		// Update activity title in repo
		const updated = createBreakActivity({
			id: activeId,
			title: 'Updated Title',
			category: 'physical',
			durationMinutes: 2
		});
		await repo.save(updated);

		await state.load();
		expect(state.activeActivity?.title).toBe('Updated Title');
	});

	describe('saveActivity', () => {
		it('should persist a new activity via repository and update sorted activities list', async () => {
			await state.load();
			expect(state.activities).toHaveLength(3);

			const newActivity = createBreakActivity({
				id: 'act-new',
				title: 'Arm Circles',
				category: 'physical',
				durationMinutes: 2
			});

			await state.saveActivity(newActivity);

			// Persisted to repository
			const repoActivities = await repo.getAll();
			expect(repoActivities.some((a) => a.id === 'act-new')).toBe(true);

			// Updates reactive activities list in sorted order
			expect(state.activities).toHaveLength(4);
			expect(state.activities.some((a) => a.id === 'act-new')).toBe(true);
			expect(state.activities.map((a) => a.id)).toEqual(
				sortBreakActivities(repoActivities).map((a) => a.id)
			);
		});

		it('should update an existing activity in repository and activities list', async () => {
			await state.load();
			const original = state.activities.find((a) => a.id === 'act-1')!;

			const updated = createBreakActivity({
				id: original.id,
				title: 'Gentle Neck Stretch',
				category: original.category,
				durationMinutes: 4
			});

			await state.saveActivity(updated);

			const foundInState = state.activities.find((a) => a.id === 'act-1');
			expect(foundInState?.title).toBe('Gentle Neck Stretch');
			expect(foundInState?.durationMinutes).toBe(4);

			const foundInRepo = (await repo.getAll()).find((a) => a.id === 'act-1');
			expect(foundInRepo?.title).toBe('Gentle Neck Stretch');
		});

		it('should update activeActivity reference when the saved activity was activeActivity', async () => {
			await state.load();
			// Ensure act-1 is active
			state.suggestForBreak('cycle-1');
			while (state.activeActivity?.id !== 'act-1') {
				state.shuffle();
			}
			expect(state.activeActivity?.id).toBe('act-1');

			const updated = createBreakActivity({
				id: 'act-1',
				title: 'Neck Release & Roll',
				category: 'physical',
				durationMinutes: 5
			});

			await state.saveActivity(updated);

			expect(state.activeActivity).toBe(updated);
			expect(state.activeActivity?.title).toBe('Neck Release & Roll');
			expect(state.activeActivity?.durationMinutes).toBe(5);
		});

		it('should not alter activeActivity when saving an unrelated activity', async () => {
			await state.load();
			state.suggestForBreak('cycle-1');
			while (state.activeActivity?.id !== 'act-1') {
				state.shuffle();
			}
			const currentActive = state.activeActivity;

			const updatedOther = createBreakActivity({
				id: 'act-2',
				title: 'Updated Breathing',
				category: 'mindful',
				durationMinutes: 10
			});

			await state.saveActivity(updatedOther);

			expect(state.activeActivity).toBe(currentActive);
		});
	});

	describe('deleteActivity', () => {
		it('should throw an error and prevent repository deletion when deleting a system preset', async () => {
			const preset = createBreakActivity({
				id: 'preset-system-1',
				title: 'System Preset Stretch',
				category: 'physical',
				durationMinutes: 2,
				isPreset: true
			});
			await repo.save(preset);
			await state.load();

			expect(state.activities.some((a) => a.id === 'preset-system-1')).toBe(true);

			await expect(state.deleteActivity('preset-system-1')).rejects.toThrow(
				'Cannot delete system preset break activity'
			);

			// Repository still has the preset
			const repoActivities = await repo.getAll();
			expect(repoActivities.some((a) => a.id === 'preset-system-1')).toBe(true);

			// State activities still has the preset
			expect(state.activities.some((a) => a.id === 'preset-system-1')).toBe(true);
		});

		it('should delete a custom activity from repository and activities list', async () => {
			const custom = createBreakActivity({
				id: 'custom-act-1',
				title: 'Custom Habit',
				category: 'physical',
				durationMinutes: 3,
				isPreset: false
			});
			await repo.save(custom);
			await state.load();

			expect(state.activities.some((a) => a.id === 'custom-act-1')).toBe(true);

			await state.deleteActivity('custom-act-1');

			const repoActivities = await repo.getAll();
			expect(repoActivities.some((a) => a.id === 'custom-act-1')).toBe(false);
			expect(state.activities.some((a) => a.id === 'custom-act-1')).toBe(false);
		});

		it('should reset activeActivity to null when the deleted activity matches activeActivity', async () => {
			const custom = createBreakActivity({
				id: 'custom-act-active',
				title: 'Active Custom Habit',
				category: 'mindful',
				durationMinutes: 3,
				isPreset: false
			});
			await repo.save(custom);
			await state.load();

			state.suggestForBreak('cycle-custom');
			while (state.activeActivity?.id !== 'custom-act-active') {
				state.shuffle();
			}
			expect(state.activeActivity?.id).toBe('custom-act-active');

			await state.deleteActivity('custom-act-active');

			expect(state.activeActivity).toBeNull();
		});

		it('should keep activeActivity unchanged when deleting a different activity', async () => {
			const customToDelete = createBreakActivity({
				id: 'custom-to-delete',
				title: 'Habit To Delete',
				category: 'hydration',
				durationMinutes: 1,
				isPreset: false
			});
			await repo.save(customToDelete);
			await state.load();

			state.suggestForBreak('cycle-retain');
			while (state.activeActivity?.id === 'custom-to-delete') {
				state.shuffle();
			}
			const retainedActive = state.activeActivity;
			expect(retainedActive).not.toBeNull();
			expect(retainedActive?.id).not.toBe('custom-to-delete');

			await state.deleteActivity('custom-to-delete');

			expect(state.activeActivity).toBe(retainedActive);
		});
	});

	describe('resetToDefaults', () => {
		it('should call repository.resetToDefaults and reload activities from repository', async () => {
			const defaultPresets = [
				createBreakActivity({
					id: 'preset-1',
					title: 'Preset One',
					category: 'physical',
					durationMinutes: 2,
					isPreset: true
				}),
				createBreakActivity({
					id: 'preset-2',
					title: 'Preset Two',
					category: 'mindful',
					durationMinutes: 5,
					isPreset: true
				})
			];
			const customActivity = createBreakActivity({
				id: 'custom-1',
				title: 'Custom User Activity',
				category: 'hydration',
				durationMinutes: 1,
				isPreset: false
			});

			const resetRepo = new FakeBreakActivityRepository(
				[...defaultPresets, customActivity],
				defaultPresets
			);
			const testState = createBreaksState(resetRepo);
			await testState.load();

			expect(testState.activities).toHaveLength(3);

			await testState.resetToDefaults();

			expect(testState.activities).toHaveLength(2);
			expect(testState.activities.map((a) => a.id)).toEqual(
				sortBreakActivities(defaultPresets).map((a) => a.id)
			);
			expect(testState.isLoaded).toBe(true);
		});

		it('should reset activeActivity to null if it was not in the reloaded activities', async () => {
			const defaultPresets = [
				createBreakActivity({
					id: 'preset-1',
					title: 'Preset One',
					category: 'physical',
					durationMinutes: 2,
					isPreset: true
				})
			];
			const customActivity = createBreakActivity({
				id: 'custom-to-be-removed',
				title: 'Custom Active',
				category: 'hydration',
				durationMinutes: 1,
				isPreset: false
			});

			const resetRepo = new FakeBreakActivityRepository(
				[...defaultPresets, customActivity],
				defaultPresets
			);
			const testState = createBreaksState(resetRepo);
			await testState.load();

			// Make the custom activity active
			testState.suggestForBreak('cycle-c');
			while (testState.activeActivity?.id !== 'custom-to-be-removed') {
				testState.shuffle();
			}
			expect(testState.activeActivity?.id).toBe('custom-to-be-removed');

			await testState.resetToDefaults();

			expect(testState.activeActivity).toBeNull();
		});

		it('should retain activeActivity if it remains in the reloaded activities', async () => {
			const defaultPresets = [
				createBreakActivity({
					id: 'preset-stay',
					title: 'Preset Stay',
					category: 'physical',
					durationMinutes: 2,
					isPreset: true
				})
			];
			const customActivity = createBreakActivity({
				id: 'custom-extra',
				title: 'Custom Extra',
				category: 'hydration',
				durationMinutes: 1,
				isPreset: false
			});

			const resetRepo = new FakeBreakActivityRepository(
				[...defaultPresets, customActivity],
				defaultPresets
			);
			const testState = createBreaksState(resetRepo);
			await testState.load();

			testState.suggestForBreak('cycle-stay');
			while (testState.activeActivity?.id !== 'preset-stay') {
				testState.shuffle();
			}
			expect(testState.activeActivity?.id).toBe('preset-stay');

			await testState.resetToDefaults();

			expect(testState.activeActivity?.id).toBe('preset-stay');
		});
	});

	it('should export singleton breaksState instance', () => {
		expect(breaksState).toBeInstanceOf(BreaksState);
	});
});
