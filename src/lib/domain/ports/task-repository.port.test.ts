import { describe, it, expect } from 'vitest';
import { createFocusTask, toggleFocusTask, type FocusTask } from '../tasks/task.entity';
import { compareFocusTasks, sortFocusTasks, type ITaskRepository } from './task-repository.port';

describe('Task Repository Port & Sorting Utilities', () => {
	describe('compareFocusTasks', () => {
		it('should sort primarily by order ascending when orders differ', () => {
			const taskA = createFocusTask({ title: 'Task A', order: 1, createdAt: 1000 });
			const taskB = createFocusTask({ title: 'Task B', order: 2, createdAt: 500 });

			expect(compareFocusTasks(taskA, taskB)).toBeLessThan(0);
			expect(compareFocusTasks(taskB, taskA)).toBeGreaterThan(0);
		});

		it('should break ties using createdAt ascending when orders are identical', () => {
			const taskEarlier = createFocusTask({ title: 'Earlier', order: 1, createdAt: 1000 });
			const taskLater = createFocusTask({ title: 'Later', order: 1, createdAt: 2000 });

			expect(compareFocusTasks(taskEarlier, taskLater)).toBeLessThan(0);
			expect(compareFocusTasks(taskLater, taskEarlier)).toBeGreaterThan(0);
		});

		it('should break ties using id ascending when both order and createdAt are identical', () => {
			const taskA = createFocusTask({ id: 'task-a', title: 'Task A', order: 2, createdAt: 1500 });
			const taskB = createFocusTask({ id: 'task-b', title: 'Task B', order: 2, createdAt: 1500 });

			expect(compareFocusTasks(taskA, taskB)).toBeLessThan(0);
			expect(compareFocusTasks(taskB, taskA)).toBeGreaterThan(0);
		});

		it('should return 0 when order, createdAt, and id are identical', () => {
			const task1 = createFocusTask({ id: 'same-id', title: 'Same 1', order: 2, createdAt: 1500 });
			const task2 = createFocusTask({ id: 'same-id', title: 'Same 2', order: 2, createdAt: 1500 });

			expect(compareFocusTasks(task1, task2)).toBe(0);
		});
	});

	describe('sortFocusTasks', () => {
		it('should sort a collection primarily by order ascending', () => {
			const task1 = createFocusTask({ title: 'Task 1', order: 3 });
			const task2 = createFocusTask({ title: 'Task 2', order: 1 });
			const task3 = createFocusTask({ title: 'Task 3', order: 2 });

			const sorted = sortFocusTasks([task1, task2, task3]);

			expect(sorted.map((t) => t.title)).toEqual(['Task 2', 'Task 3', 'Task 1']);
		});

		it('should break ties using createdAt ascending when orders are equal', () => {
			const taskA = createFocusTask({ title: 'A', order: 1, createdAt: 300 });
			const taskB = createFocusTask({ title: 'B', order: 1, createdAt: 100 });
			const taskC = createFocusTask({ title: 'C', order: 1, createdAt: 200 });

			const sorted = sortFocusTasks([taskA, taskB, taskC]);

			expect(sorted.map((t) => t.title)).toEqual(['B', 'C', 'A']);
		});

		it('should break ties using id ascending when order and createdAt are equal', () => {
			const taskA = createFocusTask({ id: 'task-a', title: 'Task A', order: 1, createdAt: 100 });
			const taskB = createFocusTask({ id: 'task-b', title: 'Task B', order: 1, createdAt: 100 });
			const taskC = createFocusTask({ id: 'task-c', title: 'Task C', order: 1, createdAt: 100 });

			const sorted = sortFocusTasks([taskC, taskA, taskB]);

			expect(sorted.map((t) => t.id)).toEqual(['task-a', 'task-b', 'task-c']);
		});

		it('should return a frozen array to preserve immutability', () => {
			const task = createFocusTask({ title: 'Task' });
			const sorted = sortFocusTasks([task]);

			expect(Object.isFrozen(sorted)).toBe(true);
			// @ts-expect-error verifying mutation is forbidden at compile-time and throws at runtime
			expect(() => sorted.push(task)).toThrow();
		});

		it('should not mutate the input array', () => {
			const task1 = createFocusTask({ title: 'T1', order: 2 });
			const task2 = createFocusTask({ title: 'T2', order: 1 });
			const original = [task1, task2];

			sortFocusTasks(original);

			expect(original[0].title).toBe('T1');
			expect(original[1].title).toBe('T2');
		});

		it('should handle empty array cleanly', () => {
			const sorted = sortFocusTasks([]);

			expect(sorted).toEqual([]);
			expect(Object.isFrozen(sorted)).toBe(true);
		});

		it('should handle single item array correctly', () => {
			const task = createFocusTask({ title: 'Only item' });
			const sorted = sortFocusTasks([task]);

			expect(sorted).toHaveLength(1);
			expect(sorted[0]).toBe(task);
			expect(Object.isFrozen(sorted)).toBe(true);
		});
	});

	describe('ITaskRepository contract compilation & in-memory behavior', () => {
		class InMemoryTaskRepository implements ITaskRepository {
			private tasks = new Map<string, FocusTask>();

			async getAll(): Promise<readonly FocusTask[]> {
				return sortFocusTasks(Array.from(this.tasks.values()));
			}

			async getPending(): Promise<readonly FocusTask[]> {
				const pending = Array.from(this.tasks.values()).filter((t) => !t.completed);
				return sortFocusTasks(pending);
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

		it('should satisfy the ITaskRepository contract across all operations', async () => {
			const repo: ITaskRepository = new InMemoryTaskRepository();

			// Initial state
			expect(await repo.getAll()).toEqual([]);
			expect(await repo.getPending()).toEqual([]);

			// Save single task
			const task1 = createFocusTask({ id: 'task-1', title: 'Task 1', order: 2, createdAt: 200 });
			await repo.save(task1);

			let all = await repo.getAll();
			expect(all).toHaveLength(1);
			expect(all[0].id).toBe('task-1');

			// Save batch
			const task2 = createFocusTask({ id: 'task-2', title: 'Task 2', order: 1, createdAt: 100 });
			const task3 = createFocusTask({ id: 'task-3', title: 'Task 3', order: 2, createdAt: 150 });
			await repo.saveBatch([task2, task3]);

			// getAll ordered: task2 (order 1), task3 (order 2, created 150), task1 (order 2, created 200)
			all = await repo.getAll();
			expect(all.map((t) => t.id)).toEqual(['task-2', 'task-3', 'task-1']);

			// Complete task2 and verify getPending
			const completedTask2 = toggleFocusTask(task2);
			await repo.save(completedTask2);

			const pending = await repo.getPending();
			expect(pending.map((t) => t.id)).toEqual(['task-3', 'task-1']);

			// Delete task3
			await repo.delete('task-3');
			expect((await repo.getAll()).map((t) => t.id)).toEqual(['task-2', 'task-1']);

			// Clear completed tasks (task2 completed, task1 pending)
			await repo.clearCompleted();
			const remaining = await repo.getAll();
			expect(remaining.map((t) => t.id)).toEqual(['task-1']);

			// Clear all
			await repo.clearAll();
			expect(await repo.getAll()).toEqual([]);
		});
	});
});
