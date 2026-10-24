import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { DailyGoalState, createDailyGoalState, dailyGoalState } from './daily-goal.svelte';
import {
	DAILY_GOAL_STORAGE_KEY,
	LocalDailyGoalRepository
} from '../adapters/storage/local-daily-goal-repository';
import { InMemoryStorage } from '../adapters/storage/in-memory-storage';
import type { DailyGoalChange } from '../domain/goals/daily-goal.entity';

/** Local noon: the local date key does not depend on the machine's time zone. */
const TODAY = new Date(2026, 9, 23, 12, 0, 0);
const YESTERDAY_KEY = '2026-10-22';
const TODAY_KEY = '2026-10-23';

function change(overrides: Partial<DailyGoalChange> = {}): DailyGoalChange {
	return { effectiveFrom: YESTERDAY_KEY, minutes: 60, restWeekdays: [7], ...overrides };
}

describe('DailyGoalState', () => {
	let storage: InMemoryStorage;
	let repository: LocalDailyGoalRepository;
	let now: Date;
	let state: DailyGoalState;

	beforeEach(() => {
		storage = new InMemoryStorage();
		repository = new LocalDailyGoalRepository(storage);
		now = TODAY;
		state = createDailyGoalState({ repository, nowProvider: () => now });
		vi.spyOn(console, 'warn').mockImplementation(() => {});
		vi.spyOn(console, 'error').mockImplementation(() => {});
	});

	afterEach(() => {
		state.destroy();
		vi.restoreAllMocks();
	});

	it('starts without a goal: there is no default', async () => {
		await state.whenIdle();

		expect(state.history).toEqual([]);
		expect(state.currentGoal).toBeNull();
	});

	it('loads the history already stored and exposes the goal in force today', async () => {
		await repository.applyChange(change());

		const other = createDailyGoalState({ repository, nowProvider: () => now });
		await other.whenIdle();

		expect(other.history).toEqual([change()]);
		expect(other.currentGoal).toEqual(change());
		other.destroy();
	});

	describe('setGoal', () => {
		it('applies a change effective today and persists it', async () => {
			const result = await state.setGoal(120, [6, 7]);

			const expected = { effectiveFrom: TODAY_KEY, minutes: 120, restWeekdays: [6, 7] };
			expect(result).toEqual({ ok: true, change: expected });
			expect(state.currentGoal).toEqual(expected);
			expect(await repository.getHistory()).toEqual([expected]);
		});

		it('collapses two edits made today into a single change', async () => {
			await state.setGoal(60, [7]);
			await state.setGoal(90, [6, 7]);

			expect(state.history).toEqual([
				{ effectiveFrom: TODAY_KEY, minutes: 90, restWeekdays: [6, 7] }
			]);
			expect(await repository.getHistory()).toEqual(state.history);
		});

		it('keeps yesterday’s change untouched when it edits today', async () => {
			await repository.applyChange(change());
			await state.whenIdle();
			state.destroy();
			state = createDailyGoalState({ repository, nowProvider: () => now });

			await state.setGoal(120, []);

			expect(state.history).toEqual([
				change(),
				{ effectiveFrom: TODAY_KEY, minutes: 120, restWeekdays: [] }
			]);
			expect(await repository.getHistory()).toEqual(state.history);
		});

		it('does not touch the goal that applied before today', async () => {
			await repository.applyChange(change({ effectiveFrom: '2026-10-01' }));
			state.destroy();
			state = createDailyGoalState({ repository, nowProvider: () => now });
			await state.whenIdle();

			await state.setGoal(30, []);

			expect(state.history[0]).toEqual(change({ effectiveFrom: '2026-10-01' }));
		});

		it('rejects an invalid goal and leaves state and storage untouched', async () => {
			await state.setGoal(60, [7]);
			const before = storage.getItem(DAILY_GOAL_STORAGE_KEY);

			expect(await state.setGoal(0.5, [])).toEqual({ ok: false, reason: 'invalid_minutes' });
			expect(await state.setGoal(60, [1, 2, 3, 4, 5, 6, 7])).toEqual({
				ok: false,
				reason: 'invalid_rest_weekdays'
			});

			expect(state.currentGoal?.minutes).toBe(60);
			expect(storage.getItem(DAILY_GOAL_STORAGE_KEY)).toBe(before);
		});

		it('removes the goal from today with zero minutes, keeping yesterday’s as it was', async () => {
			await repository.applyChange(change());
			state.destroy();
			state = createDailyGoalState({ repository, nowProvider: () => now });
			await state.whenIdle();

			await state.setGoal(0, [1]);

			expect(state.currentGoal).toBeNull();
			expect(state.history).toEqual([
				change(),
				{ effectiveFrom: TODAY_KEY, minutes: 0, restWeekdays: [] }
			]);
		});

		it('keeps the exposed history on a newer-version abort, as the repository reports it', async () => {
			const futureBytes = JSON.stringify({ version: 2, changes: [] });
			storage.setItem(DAILY_GOAL_STORAGE_KEY, futureBytes);

			await state.setGoal(60, []);

			expect(storage.getItem(DAILY_GOAL_STORAGE_KEY)).toBe(futureBytes);
			expect(state.currentGoal).toBeNull();
		});
	});

	describe('day rollover', () => {
		it('judges the goal by the day checkRollover reads', async () => {
			await state.setGoal(60, []);
			expect(state.currentGoal?.minutes).toBe(60);

			now = new Date(2026, 9, 22, 12, 0, 0);
			state.checkRollover();

			expect(state.currentGoal).toBeNull();
		});

		it('applies a new goal to the new day, not to the day it was loaded on', async () => {
			now = new Date(2026, 9, 24, 12, 0, 0);

			await state.setGoal(45, []);

			expect(state.history).toEqual([
				{ effectiveFrom: '2026-10-24', minutes: 45, restWeekdays: [] }
			]);
		});
	});

	describe('external changes', () => {
		it('reloads the history when another tab wrote', async () => {
			let notify: () => void = () => {};
			vi.spyOn(repository, 'onExternalChange').mockImplementation((listener) => {
				notify = listener;
				return () => {};
			});
			state.destroy();
			state = createDailyGoalState({ repository, nowProvider: () => now });
			await state.whenIdle();

			await repository.applyChange({ effectiveFrom: TODAY_KEY, minutes: 75, restWeekdays: [] });
			notify();
			await state.whenIdle();

			expect(state.currentGoal?.minutes).toBe(75);
		});

		it('stops listening after destroy', () => {
			const unsubscribe = vi.fn();
			vi.spyOn(repository, 'onExternalChange').mockReturnValue(unsubscribe);
			const other = createDailyGoalState({ repository, nowProvider: () => now });

			other.destroy();

			expect(unsubscribe).toHaveBeenCalledTimes(1);
		});
	});

	describe('singleton', () => {
		it('exports a DailyGoalState instance', () => {
			expect(dailyGoalState).toBeInstanceOf(DailyGoalState);
		});
	});
});
