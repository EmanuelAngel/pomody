import { describe, expect, it } from 'vitest';
import { createTaskFixture, createTaskListFixture } from '$tests/fixtures/task.fixture';

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
