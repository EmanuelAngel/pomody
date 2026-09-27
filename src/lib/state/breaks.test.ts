import { describe, it, expect, beforeEach } from 'vitest';
import { BreaksState, createBreaksState, breaksState } from './breaks.svelte';
import type { IBreakActivityRepository } from '../domain/ports/break-activity-repository.port';
import {
	createBreakActivity,
	type BreakActivity,
	type BreakCategory
} from '../domain/breaks/break-activity.entity';
import { sortBreakActivities } from '../domain/ports/break-activity-repository.port';

class MockBreakActivityRepository implements IBreakActivityRepository {
	private activities = new Map<string, BreakActivity>();

	constructor(initialActivities: readonly BreakActivity[] = []) {
		for (const act of initialActivities) {
			this.activities.set(act.id, act);
		}
	}

	async getAll(): Promise<readonly BreakActivity[]> {
		return sortBreakActivities(Array.from(this.activities.values()));
	}

	async getByCategory(category: BreakCategory): Promise<readonly BreakActivity[]> {
		return sortBreakActivities(
			Array.from(this.activities.values()).filter((a) => a.category === category)
		);
	}

	async save(activity: BreakActivity): Promise<void> {
		this.activities.set(activity.id, activity);
	}

	async delete(activityId: string): Promise<void> {
		this.activities.delete(activityId);
	}

	async resetToDefaults(): Promise<void> {
		this.activities.clear();
	}

	async clearAll(): Promise<void> {
		this.activities.clear();
	}
}

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

	let repo: MockBreakActivityRepository;
	let state: BreaksState;

	beforeEach(() => {
		repo = new MockBreakActivityRepository(sampleActivities);
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
		const emptyRepo = new MockBreakActivityRepository([]);
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
		const singleRepo = new MockBreakActivityRepository(single);
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

	it('should export singleton breaksState instance', () => {
		expect(breaksState).toBeInstanceOf(BreaksState);
	});
});
