import { describe, it, expect } from 'vitest';
import { FakeTaskRepository } from '$tests/fakes/fake-task-repository';
import { FakeBreakActivityRepository } from '$tests/fakes/fake-break-activity-repository';
import { FakeSessionPlanRepository } from '$tests/fakes/fake-session-plan-repository';
import { FakeDailyStatsRepository } from '$tests/fakes/fake-daily-stats-repository';
import { FakeSettingsStorage } from '$tests/fakes/fake-settings-storage';
import { createFocusTask, type FocusTask } from '$lib/domain/tasks/task.entity';
import {
	createBreakActivity,
	PRESET_BREAK_ACTIVITIES
} from '$lib/domain/breaks/break-activity.entity';
import type { SessionPlan } from '$lib/domain/planning/session-plan.entity';
import { DEFAULT_USER_SETTINGS } from '$lib/domain/ports/settings-storage.port';
import { INITIAL_DAILY_STATS } from '$lib/domain/ports/daily-stats-repository.port';

describe('Repository Fakes', () => {
	describe('FakeTaskRepository', () => {
		it('initializes with empty tasks by default', async () => {
			const repo = new FakeTaskRepository();
			expect(await repo.getAll()).toEqual([]);
			expect(await repo.getPending()).toEqual([]);
		});

		it('initializes with provided tasks and sorts them deterministically', async () => {
			const task1 = createFocusTask({ id: 'task-c', title: 'Task C', order: 2 });
			const task2 = createFocusTask({ id: 'task-a', title: 'Task A', order: 0 });
			const task3 = createFocusTask({ id: 'task-b', title: 'Task B', order: 1 });

			const repo = new FakeTaskRepository([task1, task2, task3]);
			const all = await repo.getAll();

			expect(all.map((t) => t.id)).toEqual(['task-a', 'task-b', 'task-c']);
		});

		it('saves new tasks and updates existing tasks (upsert)', async () => {
			const repo = new FakeTaskRepository();
			const task = createFocusTask({ id: 'task-1', title: 'Initial Title', order: 0 });

			await repo.save(task);
			expect(await repo.getAll()).toEqual([task]);

			const updatedTask: FocusTask = {
				...task,
				title: 'Updated Title',
				completed: true,
				completedAt: 12345
			};
			await repo.save(updatedTask);

			const all = await repo.getAll();
			expect(all).toHaveLength(1);
			expect(all[0]).toEqual(updatedTask);
		});

		it('saves batch of tasks successfully', async () => {
			const repo = new FakeTaskRepository();
			const task1 = createFocusTask({ id: 'task-1', title: 'Task 1', order: 1 });
			const task2 = createFocusTask({ id: 'task-2', title: 'Task 2', order: 0 });

			await repo.saveBatch([task1, task2]);
			const all = await repo.getAll();

			expect(all.map((t) => t.id)).toEqual(['task-2', 'task-1']);
		});

		it('filters pending tasks correctly with deterministic sorting', async () => {
			const t1 = createFocusTask({ id: 'task-1', title: 'Task 1', order: 0 });
			const t2: FocusTask = {
				...createFocusTask({ id: 'task-2', title: 'Task 2', order: 1 }),
				completed: true,
				completedAt: 1000
			};
			const t3 = createFocusTask({ id: 'task-3', title: 'Task 3', order: 2 });

			const repo = new FakeTaskRepository([t1, t2, t3]);
			const pending = await repo.getPending();

			expect(pending.map((t) => t.id)).toEqual(['task-1', 'task-3']);
		});

		it('deletes a task by id', async () => {
			const task1 = createFocusTask({ id: 'task-1', title: 'Task 1' });
			const task2 = createFocusTask({ id: 'task-2', title: 'Task 2' });
			const repo = new FakeTaskRepository([task1, task2]);

			await repo.delete('task-1');
			expect(await repo.getAll()).toEqual([task2]);

			// Deleting non-existent task is safe and idempotent
			await repo.delete('non-existent');
			expect(await repo.getAll()).toEqual([task2]);
		});

		it('clears completed tasks while preserving pending tasks', async () => {
			const t1 = createFocusTask({ id: 'task-1', title: 'Task 1', order: 0 });
			const t2: FocusTask = {
				...createFocusTask({ id: 'task-2', title: 'Task 2', order: 1 }),
				completed: true
			};
			const t3 = createFocusTask({ id: 'task-3', title: 'Task 3', order: 2 });

			const repo = new FakeTaskRepository([t1, t2, t3]);
			await repo.clearCompleted();

			const all = await repo.getAll();
			expect(all.map((t) => t.id)).toEqual(['task-1', 'task-3']);
		});

		it('clears all tasks', async () => {
			const t1 = createFocusTask({ id: 'task-1', title: 'Task 1' });
			const repo = new FakeTaskRepository([t1]);

			await repo.clearAll();
			expect(await repo.getAll()).toEqual([]);
		});
	});

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
	});

	describe('FakeSessionPlanRepository', () => {
		const samplePlan: SessionPlan = {
			id: 'plan-1',
			targetMode: 'blocks',
			blocks: [
				{
					index: 0,
					mode: 'focus',
					durationSeconds: 1500,
					status: 'pending'
				}
			],
			sessionConfig: {
				focusDurationSeconds: 1500,
				shortBreakDurationSeconds: 300,
				longBreakDurationSeconds: 900,
				roundsBeforeLongBreak: 4
			},
			createdAt: 1000,
			freeMarginSeconds: 0
		};

		it('initializes with null active plan by default', async () => {
			const repo = new FakeSessionPlanRepository();
			expect(await repo.getActivePlan()).toBeNull();
			expect(repo.getActivePlanCallCount).toBe(1);
		});

		it('initializes with provided active plan', async () => {
			const repo = new FakeSessionPlanRepository(samplePlan);
			expect(await repo.getActivePlan()).toEqual(samplePlan);
		});

		it('saves and updates the active plan', async () => {
			const repo = new FakeSessionPlanRepository();
			await repo.saveActivePlan(samplePlan);

			expect(repo.saveActivePlanCallCount).toBe(1);
			expect(await repo.getActivePlan()).toEqual(samplePlan);
		});

		it('clears the active plan', async () => {
			const repo = new FakeSessionPlanRepository(samplePlan);
			await repo.clearActivePlan();

			expect(repo.clearActivePlanCallCount).toBe(1);
			expect(await repo.getActivePlan()).toBeNull();
		});
	});

	describe('FakeDailyStatsRepository', () => {
		it('initializes with INITIAL_DAILY_STATS by default', () => {
			const repo = new FakeDailyStatsRepository();
			expect(repo.loadStats()).toEqual(INITIAL_DAILY_STATS);
		});

		it('initializes with partial stats merged with defaults', () => {
			const repo = new FakeDailyStatsRepository({
				date: '2026-10-03',
				completedBlocks: 5
			});

			expect(repo.loadStats()).toEqual({
				date: '2026-10-03',
				completedBlocks: 5,
				accumulatedMinutes: 0
			});
		});

		it('saves stats and records calls', () => {
			const repo = new FakeDailyStatsRepository();
			const newStats = {
				date: '2026-10-03',
				completedBlocks: 3,
				accumulatedMinutes: 75
			};

			repo.saveStats(newStats);

			expect(repo.loadStats()).toEqual(newStats);
			expect(repo.saveStatsCalls).toHaveLength(1);
			expect(repo.saveStatsCalls[0]).toEqual(newStats);
		});

		it('resets focus stats to 0 while preserving the date', () => {
			const repo = new FakeDailyStatsRepository({
				date: '2026-10-03',
				completedBlocks: 8,
				accumulatedMinutes: 200
			});

			repo.resetStats();

			expect(repo.resetStatsCalls).toBe(1);
			expect(repo.loadStats()).toEqual({
				date: '2026-10-03',
				completedBlocks: 0,
				accumulatedMinutes: 0
			});
		});
	});

	describe('FakeSettingsStorage', () => {
		it('initializes with DEFAULT_USER_SETTINGS by default', () => {
			const storage = new FakeSettingsStorage();
			expect(storage.loadSettings()).toEqual(DEFAULT_USER_SETTINGS);
		});

		it('merges partial initialSettings, including nested timer overrides', () => {
			const storage = new FakeSettingsStorage({
				soundEnabled: false,
				theme: 'dawn',
				timer: {
					...DEFAULT_USER_SETTINGS.timer,
					focusDurationSeconds: 1800
				}
			});

			const loaded = storage.loadSettings();
			expect(loaded.soundEnabled).toBe(false);
			expect(loaded.theme).toBe('dawn');
			expect(loaded.timer.focusDurationSeconds).toBe(1800);
			expect(loaded.timer.shortBreakDurationSeconds).toBe(
				DEFAULT_USER_SETTINGS.timer.shortBreakDurationSeconds
			);
		});

		it('saves patch with deep timer merge and tracks calls', () => {
			const storage = new FakeSettingsStorage();

			storage.saveSettings({
				theme: 'oled',
				timer: {
					...DEFAULT_USER_SETTINGS.timer,
					shortBreakDurationSeconds: 600
				}
			});

			const loaded = storage.loadSettings();
			expect(loaded.theme).toBe('oled');
			expect(loaded.timer.shortBreakDurationSeconds).toBe(600);
			expect(loaded.timer.focusDurationSeconds).toBe(
				DEFAULT_USER_SETTINGS.timer.focusDurationSeconds
			);
			expect(storage.saveSettingsCalls).toHaveLength(1);
		});

		it('resets settings back to defaults', () => {
			const storage = new FakeSettingsStorage({
				theme: 'oled',
				soundEnabled: false
			});

			storage.resetSettings();

			expect(storage.resetSettingsCalls).toBe(1);
			expect(storage.loadSettings()).toEqual(DEFAULT_USER_SETTINGS);
		});

		it('returns defensive copies from loadSettings to prevent external mutations', () => {
			const storage = new FakeSettingsStorage();
			const settings1 = storage.loadSettings();

			// Attempt mutation on returned object
			(settings1 as { soundEnabled: boolean }).soundEnabled = false;

			const settings2 = storage.loadSettings();
			expect(settings2.soundEnabled).toBe(true);
		});
	});
});
