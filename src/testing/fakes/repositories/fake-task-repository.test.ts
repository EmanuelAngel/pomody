import { describe, it, expect } from 'vitest';
import { FakeTaskRepository } from '$tests/fakes/repositories/fake-task-repository';
import { createFocusTask, type FocusTask } from '$lib/domain/tasks/task.entity';

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
