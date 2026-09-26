import { describe, it, expect, beforeEach } from 'vitest';
import { TasksState, createTasksState } from './tasks.svelte';
import type { ITaskRepository } from '../domain/ports/task-repository.port';
import { createFocusTask, type FocusTask } from '../domain/tasks/task.entity';
import { sortFocusTasks } from '../domain/ports/task-repository.port';

class MockTaskRepository implements ITaskRepository {
	private tasks = new Map<string, FocusTask>();

	async getAll(): Promise<readonly FocusTask[]> {
		return sortFocusTasks(Array.from(this.tasks.values()));
	}

	async getPending(): Promise<readonly FocusTask[]> {
		return sortFocusTasks(Array.from(this.tasks.values()).filter((t) => !t.completed));
	}

	async save(task: FocusTask): Promise<void> {
		this.tasks.set(task.id, task);
	}

	async saveBatch(tasks: readonly FocusTask[]): Promise<void> {
		for (const task of tasks) {
			this.tasks.set(task.id, task);
		}
	}

	async delete(taskId: string): Promise<void> {
		this.tasks.delete(taskId);
	}

	async clearCompleted(): Promise<void> {
		for (const [id, task] of this.tasks.entries()) {
			if (task.completed) {
				this.tasks.delete(id);
			}
		}
	}

	async clearAll(): Promise<void> {
		this.tasks.clear();
	}
}

describe('TasksState', () => {
	let repo: MockTaskRepository;
	let state: TasksState;

	beforeEach(() => {
		repo = new MockTaskRepository();
		state = createTasksState(repo);
	});

	it('should initialize with default empty state', () => {
		expect(state.tasks).toEqual([]);
		expect(state.pendingTasks).toEqual([]);
		expect(state.completedTasks).toEqual([]);
		expect(state.activeTaskId).toBeNull();
		expect(state.activeTask).toBeNull();
		expect(state.isLoading).toBe(false);
		expect(state.isLoaded).toBe(false);
	});

	it('should load tasks from repository and update loaded flags', async () => {
		const task = createFocusTask({ title: 'Task from storage' });
		await repo.save(task);

		await state.load();

		expect(state.isLoaded).toBe(true);
		expect(state.tasks).toHaveLength(1);
		expect(state.tasks[0].title).toBe('Task from storage');
	});

	it('should clear activeTaskId on load if the active task no longer exists', async () => {
		state.setActiveTask('ghost-id');
		expect(state.activeTaskId).toBeNull(); // won't set because it does not exist

		const task = createFocusTask({ title: 'Real task' });
		await repo.save(task);
		await state.load();

		state.setActiveTask(task.id);
		expect(state.activeTaskId).toBe(task.id);

		// Remove from repo directly and reload
		await repo.delete(task.id);
		await state.load();

		expect(state.activeTaskId).toBeNull();
	});

	it('should create new tasks with sequential orders and persist them', async () => {
		const task1 = await state.createTask('First Task');
		const task2 = await state.createTask('Second Task');

		expect(task1.order).toBe(0);
		expect(task2.order).toBe(1);
		expect(state.tasks).toHaveLength(2);
		expect(state.pendingTasks).toHaveLength(2);

		const inRepo = await repo.getAll();
		expect(inRepo).toHaveLength(2);
	});

	it('should toggle task completion and update pending/completed derived states', async () => {
		const task = await state.createTask('Toggle Me');
		expect(task.completed).toBe(false);
		expect(state.pendingTasks).toHaveLength(1);
		expect(state.completedTasks).toHaveLength(0);

		await state.toggleTask(task.id);
		expect(state.pendingTasks).toHaveLength(0);
		expect(state.completedTasks).toHaveLength(1);
		expect(state.completedTasks[0].completed).toBe(true);
		expect(state.completedTasks[0].completedAt).toBeDefined();

		// Toggle back to incomplete
		await state.toggleTask(task.id);
		expect(state.pendingTasks).toHaveLength(1);
		expect(state.completedTasks).toHaveLength(0);
	});

	it('should update task title after validation', async () => {
		const task = await state.createTask('Original Title');
		await state.updateTitle(task.id, 'Updated Title');

		expect(state.tasks[0].title).toBe('Updated Title');
		const inRepo = await repo.getAll();
		expect(inRepo[0].title).toBe('Updated Title');
	});

	it('should delete task and clear activeTaskId if deleted task was active', async () => {
		const task = await state.createTask('To be deleted');
		state.setActiveTask(task.id);
		expect(state.activeTaskId).toBe(task.id);

		await state.deleteTask(task.id);
		expect(state.tasks).toHaveLength(0);
		expect(state.activeTaskId).toBeNull();
		expect(state.activeTask).toBeNull();

		const inRepo = await repo.getAll();
		expect(inRepo).toHaveLength(0);
	});

	it('should reorder tasks and persist new batch orders', async () => {
		const t1 = await state.createTask('Task 1');
		const t2 = await state.createTask('Task 2');
		const t3 = await state.createTask('Task 3');

		await state.reorderTasks([t3.id, t1.id, t2.id]);

		expect(state.tasks[0].id).toBe(t3.id);
		expect(state.tasks[0].order).toBe(0);
		expect(state.tasks[1].id).toBe(t1.id);
		expect(state.tasks[1].order).toBe(1);
		expect(state.tasks[2].id).toBe(t2.id);
		expect(state.tasks[2].order).toBe(2);
	});

	it('should set active task only if it exists in state', async () => {
		const task = await state.createTask('Focus Task');
		state.setActiveTask('unknown-id');
		expect(state.activeTaskId).toBeNull();

		state.setActiveTask(task.id);
		expect(state.activeTaskId).toBe(task.id);
		expect(state.activeTask?.title).toBe('Focus Task');

		state.setActiveTask(null);
		expect(state.activeTaskId).toBeNull();
		expect(state.activeTask).toBeNull();
	});

	it('should clear completed tasks and unset active task if it was completed', async () => {
		const t1 = await state.createTask('Incomplete');
		const t2 = await state.createTask('Complete');
		await state.toggleTask(t2.id);

		state.setActiveTask(t2.id);
		expect(state.activeTaskId).toBe(t2.id);

		await state.clearCompleted();

		expect(state.tasks).toHaveLength(1);
		expect(state.tasks[0].id).toBe(t1.id);
		expect(state.activeTaskId).toBeNull();
	});

	it('should clear all tasks and reset state completely', async () => {
		const t1 = await state.createTask('Task 1');
		state.setActiveTask(t1.id);

		await state.clearAll();

		expect(state.tasks).toHaveLength(0);
		expect(state.activeTaskId).toBeNull();
		expect(state.activeTask).toBeNull();
		const inRepo = await repo.getAll();
		expect(inRepo).toHaveLength(0);
	});
});
