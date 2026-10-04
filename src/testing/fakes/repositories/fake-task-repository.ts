import type { FocusTask } from '$lib/domain/tasks/task.entity';
import { type ITaskRepository, sortFocusTasks } from '$lib/domain/ports/task-repository.port';

/**
 * In-memory test fake implementing ITaskRepository.
 * Stores tasks in-memory and returns them deterministically sorted via sortFocusTasks.
 */
export class FakeTaskRepository implements ITaskRepository {
	private readonly tasks = new Map<string, FocusTask>();

	constructor(initialTasks: readonly FocusTask[] = []) {
		for (const task of initialTasks) {
			this.tasks.set(task.id, task);
		}
	}

	async getAll(): Promise<readonly FocusTask[]> {
		return sortFocusTasks(Array.from(this.tasks.values()));
	}

	async getPending(): Promise<readonly FocusTask[]> {
		const pending = Array.from(this.tasks.values()).filter((task) => !task.completed);
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
