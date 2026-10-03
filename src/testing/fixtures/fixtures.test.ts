import { describe, expect, it } from 'vitest';
import { createTaskFixture, createTaskListFixture } from '$tests/fixtures/task.fixture';
import {
	createBreakActivityFixture,
	createBreakActivityListFixture
} from '$tests/fixtures/break-activity.fixture';
import { createSessionPlanFixture } from '$tests/fixtures/session-plan.fixture';
import { DEFAULT_TIMER_CONFIG } from '$lib/domain/timer/timer-fsm';

describe('Test Kit Fixtures', () => {
	describe('task.fixture', () => {
		it('should create a task with default values', () => {
			const task = createTaskFixture();

			expect(task).toEqual({
				id: 'task-fixture-1',
				title: 'Sample Focus Task',
				order: 0,
				completed: false,
				createdAt: 1000
			});
			expect(Object.isFrozen(task)).toBe(true);
		});

		it('should apply partial overrides to task', () => {
			const task = createTaskFixture({
				id: 'custom-task-id',
				title: 'Refactor Architecture',
				order: 5,
				createdAt: 5000
			});

			expect(task.id).toBe('custom-task-id');
			expect(task.title).toBe('Refactor Architecture');
			expect(task.order).toBe(5);
			expect(task.createdAt).toBe(5000);
			expect(task.completed).toBe(false);
			expect(Object.isFrozen(task)).toBe(true);
		});

		it('should generate an immutable list of tasks with sequential IDs and ordering', () => {
			const tasks = createTaskListFixture(3);

			expect(tasks).toHaveLength(3);
			expect(Object.isFrozen(tasks)).toBe(true);

			expect(tasks[0]).toEqual({
				id: 'task-fixture-1',
				title: 'Sample Focus Task',
				order: 0,
				completed: false,
				createdAt: 1000
			});
			expect(tasks[1]).toEqual({
				id: 'task-fixture-2',
				title: 'Sample Focus Task',
				order: 1,
				completed: false,
				createdAt: 1000
			});
			expect(tasks[2]).toEqual({
				id: 'task-fixture-3',
				title: 'Sample Focus Task',
				order: 2,
				completed: false,
				createdAt: 1000
			});

			for (const task of tasks) {
				expect(Object.isFrozen(task)).toBe(true);
			}
		});

		it('should apply baseOverrides and offset ordering in task lists', () => {
			const tasks = createTaskListFixture(2, {
				title: 'Shared Title',
				order: 10,
				createdAt: 2000
			});

			expect(tasks).toHaveLength(2);
			expect(tasks[0].title).toBe('Shared Title');
			expect(tasks[0].order).toBe(10);
			expect(tasks[0].createdAt).toBe(2000);
			expect(tasks[1].title).toBe('Shared Title');
			expect(tasks[1].order).toBe(11);
			expect(tasks[1].createdAt).toBe(2000);
		});

		it('should namespace custom IDs in task lists', () => {
			const singleTask = createTaskListFixture(1, { id: 'single' });
			expect(singleTask[0].id).toBe('single');

			const multipleTasks = createTaskListFixture(2, { id: 'item' });
			expect(multipleTasks[0].id).toBe('item-1');
			expect(multipleTasks[1].id).toBe('item-2');
		});

		it('should return empty frozen array when count is 0', () => {
			const tasks = createTaskListFixture(0);
			expect(tasks).toEqual([]);
			expect(Object.isFrozen(tasks)).toBe(true);
		});
	});

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

	describe('session-plan.fixture', () => {
		it('should create a session plan with default values', () => {
			const plan = createSessionPlanFixture();

			expect(plan.id).toBe('plan-fixture-1');
			expect(plan.targetMode).toBe('blocks');
			expect(plan.createdAt).toBe(1000);
			expect(plan.sessionConfig).toEqual(DEFAULT_TIMER_CONFIG);
			// 4 focus blocks + 3 breaks (short breaks since 1, 2, 3 < 4) = 7 blocks total
			expect(plan.blocks).toHaveLength(7);
			expect(plan.blocks[0].mode).toBe('focus');
			expect(plan.blocks[1].mode).toBe('shortBreak');
			expect(plan.blocks[2].mode).toBe('focus');
			expect(plan.blocks[3].mode).toBe('shortBreak');
			expect(plan.blocks[4].mode).toBe('focus');
			expect(plan.blocks[5].mode).toBe('shortBreak');
			expect(plan.blocks[6].mode).toBe('focus');

			expect(Object.isFrozen(plan)).toBe(true);
			expect(Object.isFrozen(plan.blocks)).toBe(true);
		});

		it('should apply partial overrides to session plan', () => {
			const plan = createSessionPlanFixture({
				id: 'custom-plan',
				blockCount: 2,
				createdAt: 3000,
				scheduledStartTimestamp: 10000
			});

			expect(plan.id).toBe('custom-plan');
			expect(plan.createdAt).toBe(3000);
			expect(plan.scheduledStartTimestamp).toBe(10000);
			expect(plan.targetEndTimestamp).toBeDefined();
			// 2 focus blocks + 1 short break = 3 blocks
			expect(plan.blocks).toHaveLength(3);
			expect(plan.blocks[0].mode).toBe('focus');
			expect(plan.blocks[1].mode).toBe('shortBreak');
			expect(plan.blocks[2].mode).toBe('focus');
			expect(Object.isFrozen(plan)).toBe(true);
		});

		it('should schedule long breaks when roundsBeforeLongBreak is reached', () => {
			const customConfig = {
				...DEFAULT_TIMER_CONFIG,
				roundsBeforeLongBreak: 2
			};

			const plan = createSessionPlanFixture({
				blockCount: 3,
				sessionConfig: customConfig
			});

			// Focus 1 -> Short Break -> Focus 2 -> Long Break (round 2 reached) -> Focus 3
			expect(plan.blocks).toHaveLength(5);
			expect(plan.blocks[0].mode).toBe('focus');
			expect(plan.blocks[1].mode).toBe('shortBreak');
			expect(plan.blocks[2].mode).toBe('focus');
			expect(plan.blocks[3].mode).toBe('longBreak');
			expect(plan.blocks[4].mode).toBe('focus');
		});
	});
});
