import {
	createFocusTask,
	toggleFocusTask,
	updateFocusTaskTitle,
	reorderFocusTasks,
	type FocusTask
} from '../domain/tasks/task.entity';
import { type ITaskRepository, sortFocusTasks } from '../domain/ports/task-repository.port';
import { LocalStorageTaskRepository } from '../adapters/storage/local-task-repository';

/**
 * Reactive state store managing Focus Tasks with Svelte 5 Runes ($state, $derived).
 * Connects the pure domain FocusTask entity operations with ITaskRepository persistence.
 */
export class TasksState {
	private readonly repository: ITaskRepository;

	private _tasks = $state<readonly FocusTask[]>([]);
	private _activeTaskId = $state<string | null>(null);
	private _isLoading = $state<boolean>(false);
	private _isLoaded = $state<boolean>(false);

	public readonly tasks = $derived.by(() => this._tasks);
	public readonly pendingTasks = $derived.by(() =>
		sortFocusTasks(this._tasks.filter((t) => !t.completed))
	);
	public readonly completedTasks = $derived.by(() =>
		[...this._tasks.filter((t) => t.completed)].sort(
			(a, b) => (b.completedAt ?? 0) - (a.completedAt ?? 0)
		)
	);
	public readonly activeTaskId = $derived.by(() => this._activeTaskId);
	public readonly activeTask = $derived.by(
		() => this._tasks.find((t) => t.id === this._activeTaskId) ?? null
	);
	public readonly isLoading = $derived.by(() => this._isLoading);
	public readonly isLoaded = $derived.by(() => this._isLoaded);

	constructor(repository?: ITaskRepository) {
		this.repository = repository ?? new LocalStorageTaskRepository();
	}

	public async load(): Promise<void> {
		this._isLoading = true;
		try {
			const tasks = await this.repository.getAll();
			this._tasks = tasks;
			this._isLoaded = true;

			if (this._activeTaskId && !tasks.some((t) => t.id === this._activeTaskId)) {
				this._activeTaskId = null;
			}
		} finally {
			this._isLoading = false;
		}
	}

	public async createTask(title: string): Promise<FocusTask> {
		const nextOrder = this._tasks.length > 0 ? Math.max(...this._tasks.map((t) => t.order)) + 1 : 0;
		const task = createFocusTask({ title, order: nextOrder });

		await this.repository.save(task);
		this._tasks = sortFocusTasks([...this._tasks, task]);
		return task;
	}

	public async toggleTask(taskId: string): Promise<void> {
		const task = this._tasks.find((t) => t.id === taskId);
		if (!task) return;

		const updated = toggleFocusTask(task);
		await this.repository.save(updated);
		this._tasks = sortFocusTasks(this._tasks.map((t) => (t.id === taskId ? updated : t)));
	}

	public async updateTitle(taskId: string, newTitle: string): Promise<void> {
		const task = this._tasks.find((t) => t.id === taskId);
		if (!task) return;

		const updated = updateFocusTaskTitle(task, newTitle);
		await this.repository.save(updated);
		this._tasks = this._tasks.map((t) => (t.id === taskId ? updated : t));
	}

	public async deleteTask(taskId: string): Promise<void> {
		await this.repository.delete(taskId);
		if (this._activeTaskId === taskId) {
			this._activeTaskId = null;
		}
		this._tasks = this._tasks.filter((t) => t.id !== taskId);
	}

	public async reorderTasks(orderedIds: readonly string[]): Promise<void> {
		const reordered = reorderFocusTasks(this._tasks, orderedIds);
		await this.repository.saveBatch(reordered);
		this._tasks = reordered;
	}

	public setActiveTask(taskId: string | null): void {
		if (taskId === null) {
			this._activeTaskId = null;
			return;
		}
		const task = this._tasks.find((t) => t.id === taskId);
		if (task) {
			this._activeTaskId = taskId;
		}
	}

	public async clearCompleted(): Promise<void> {
		await this.repository.clearCompleted();
		if (this._activeTaskId) {
			const active = this._tasks.find((t) => t.id === this._activeTaskId);
			if (active?.completed) {
				this._activeTaskId = null;
			}
		}
		this._tasks = this._tasks.filter((t) => !t.completed);
	}

	public async clearAll(): Promise<void> {
		await this.repository.clearAll();
		this._activeTaskId = null;
		this._tasks = [];
	}
}

export function createTasksState(repository?: ITaskRepository): TasksState {
	return new TasksState(repository);
}

export const tasksState = createTasksState();
