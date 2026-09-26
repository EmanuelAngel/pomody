import type { FocusTask } from '../../domain/tasks/task.entity';
import { TASK_TITLE_MAX_LENGTH } from '../../domain/tasks/task.entity';
import { type ITaskRepository, sortFocusTasks } from '../../domain/ports/task-repository.port';

export const TASKS_STORAGE_KEY = 'pomody:tasks';
export const TASKS_STORAGE_VERSION = 1;

export interface StoredTasksEnvelope {
	readonly version: number;
	readonly tasks: readonly FocusTask[];
}

/**
 * Defensive validation checking that raw input matches FocusTask shape:
 * - id: non-empty string
 * - title: string, trimmed, non-empty, length <= 120
 * - completed: boolean
 * - createdAt: finite number > 0
 * - order: finite integer >= 0
 * - completedAt: undefined or finite number > 0
 *
 * Returns a frozen FocusTask or null if corrupt.
 */
export function sanitizeTask(raw: unknown): FocusTask | null {
	if (typeof raw !== 'object' || raw === null) {
		return null;
	}

	const candidate = raw as Record<string, unknown>;

	if (typeof candidate.id !== 'string' || candidate.id.trim().length === 0) {
		return null;
	}

	if (typeof candidate.title !== 'string') {
		return null;
	}

	const trimmedTitle = candidate.title.trim();
	if (trimmedTitle.length === 0 || trimmedTitle.length > TASK_TITLE_MAX_LENGTH) {
		return null;
	}

	if (typeof candidate.completed !== 'boolean') {
		return null;
	}

	if (
		typeof candidate.createdAt !== 'number' ||
		!Number.isFinite(candidate.createdAt) ||
		candidate.createdAt <= 0
	) {
		return null;
	}

	if (
		typeof candidate.order !== 'number' ||
		!Number.isInteger(candidate.order) ||
		candidate.order < 0
	) {
		return null;
	}

	let completedAt: number | undefined = undefined;
	if (candidate.completedAt !== undefined) {
		if (
			typeof candidate.completedAt !== 'number' ||
			!Number.isFinite(candidate.completedAt) ||
			candidate.completedAt <= 0
		) {
			return null;
		}
		completedAt = candidate.completedAt;
	}

	const task: FocusTask = {
		id: candidate.id,
		title: trimmedTitle,
		completed: candidate.completed,
		createdAt: candidate.createdAt,
		order: candidate.order,
		...(completedAt !== undefined ? { completedAt } : {})
	};

	return Object.freeze(task);
}

/**
 * Browser LocalStorage implementation of ITaskRepository.
 * Persists tasks in a versioned envelope with defensive validation and self-healing.
 * Safe for use in SSR/Node and resilient against storage exceptions (e.g. QuotaExceededError, SecurityError).
 */
export class LocalStorageTaskRepository implements ITaskRepository {
	private readonly injectedStorage?: Storage;

	constructor(storage?: Storage) {
		this.injectedStorage = storage;
	}

	/**
	 * Checks injected storage, then window.localStorage with try/catch for SSR and SecurityError.
	 */
	public getStorage(): Storage | null {
		if (this.injectedStorage !== undefined) {
			return this.injectedStorage;
		}

		if (typeof window !== 'undefined') {
			try {
				return window.localStorage;
			} catch {
				return null;
			}
		}

		return null;
	}

	/**
	 * Sanitization helper delegating to sanitizeTask.
	 */
	public sanitizeTask(raw: unknown): FocusTask | null {
		return sanitizeTask(raw);
	}

	/**
	 * Returns all sanitized tasks sorted deterministically via sortFocusTasks.
	 */
	public async getAll(): Promise<readonly FocusTask[]> {
		const tasks = this.readTasks();
		return sortFocusTasks(tasks);
	}

	/**
	 * Returns uncompleted sanitized tasks sorted deterministically via sortFocusTasks.
	 */
	public async getPending(): Promise<readonly FocusTask[]> {
		const tasks = this.readTasks();
		const pending = tasks.filter((task) => !task.completed);
		return sortFocusTasks(pending);
	}

	/**
	 * Upserts task by id and writes envelope to storage.
	 */
	public async save(task: FocusTask): Promise<void> {
		const sanitized = this.sanitizeTask(task);
		if (!sanitized) {
			return;
		}

		const current = this.readTasks();
		const index = current.findIndex((t) => t.id === sanitized.id);
		let nextTasks: FocusTask[];

		if (index >= 0) {
			nextTasks = [...current];
			nextTasks[index] = sanitized;
		} else {
			nextTasks = [...current, sanitized];
		}

		this.writeTasks(nextTasks);
	}

	/**
	 * Upserts multiple tasks by id and writes envelope to storage.
	 */
	public async saveBatch(tasks: readonly FocusTask[]): Promise<void> {
		const validBatch = tasks
			.map((t) => this.sanitizeTask(t))
			.filter((t): t is FocusTask => t !== null);

		if (validBatch.length === 0) {
			return;
		}

		const current = this.readTasks();
		const map = new Map<string, FocusTask>();
		for (const t of current) {
			map.set(t.id, t);
		}
		for (const t of validBatch) {
			map.set(t.id, t);
		}

		this.writeTasks(Array.from(map.values()));
	}

	/**
	 * Removes task by id and writes envelope to storage.
	 */
	public async delete(taskId: string): Promise<void> {
		const current = this.readTasks();
		const remaining = current.filter((t) => t.id !== taskId);
		this.writeTasks(remaining);
	}

	/**
	 * Removes completed tasks and writes envelope to storage.
	 */
	public async clearCompleted(): Promise<void> {
		const current = this.readTasks();
		const pending = current.filter((t) => !t.completed);
		this.writeTasks(pending);
	}

	/**
	 * Calls storage.removeItem(TASKS_STORAGE_KEY) safely.
	 * Must NOT touch any other key (such as pomody:settings).
	 */
	public async clearAll(): Promise<void> {
		const storage = this.getStorage();
		if (!storage) {
			return;
		}

		try {
			storage.removeItem(TASKS_STORAGE_KEY);
		} catch {
			// Gracefully handle DOMException / SecurityError
		}
	}

	/**
	 * Reads and sanitizes tasks from storage.
	 * Returns empty array if storage is inaccessible, empty, corrupted, or version mismatch.
	 */
	private readTasks(): FocusTask[] {
		const storage = this.getStorage();
		if (!storage) {
			return [];
		}

		let raw: string | null;
		try {
			raw = storage.getItem(TASKS_STORAGE_KEY);
		} catch {
			return [];
		}

		if (!raw) {
			return [];
		}

		let parsed: unknown;
		try {
			parsed = JSON.parse(raw);
		} catch {
			return [];
		}

		if (typeof parsed !== 'object' || parsed === null) {
			return [];
		}

		const envelope = parsed as Record<string, unknown>;
		if (envelope.version !== TASKS_STORAGE_VERSION || !Array.isArray(envelope.tasks)) {
			return [];
		}

		const tasks: FocusTask[] = [];
		for (const rawTask of envelope.tasks) {
			const sanitized = this.sanitizeTask(rawTask);
			if (sanitized !== null) {
				tasks.push(sanitized);
			}
		}

		return tasks;
	}

	/**
	 * Writes envelope to storage with defensive exception handling.
	 */
	private writeTasks(tasks: readonly FocusTask[]): void {
		const storage = this.getStorage();
		if (!storage) {
			return;
		}

		if (this.hasNewerVersionStored(storage)) {
			console.warn(
				`Storage contains a newer envelope version than supported (${TASKS_STORAGE_VERSION}). Write aborted to prevent data loss.`
			);
			return;
		}

		const envelope: StoredTasksEnvelope = {
			version: TASKS_STORAGE_VERSION,
			tasks: sortFocusTasks(tasks)
		};

		try {
			storage.setItem(TASKS_STORAGE_KEY, JSON.stringify(envelope));
		} catch (err) {
			console.error('Failed to write tasks to storage:', err);
		}
	}

	/**
	 * Checks whether storage contains an envelope with a newer version than supported.
	 */
	private hasNewerVersionStored(storage: Storage): boolean {
		try {
			const raw = storage.getItem(TASKS_STORAGE_KEY);
			if (!raw) {
				return false;
			}
			const parsed: unknown = JSON.parse(raw);
			if (typeof parsed !== 'object' || parsed === null) {
				return false;
			}
			const envelope = parsed as Record<string, unknown>;
			return typeof envelope.version === 'number' && envelope.version > TASKS_STORAGE_VERSION;
		} catch {
			return false;
		}
	}
}
