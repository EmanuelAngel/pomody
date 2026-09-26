export const TASK_TITLE_MAX_LENGTH = 120;

export class InvalidTaskTitleError extends Error {
	constructor(message: string) {
		super(message);
		this.name = 'InvalidTaskTitleError';
	}
}

export interface FocusTask {
	readonly id: string;
	readonly title: string;
	readonly completed: boolean;
	readonly createdAt: number;
	readonly order: number;
	readonly completedAt?: number;
}

export interface CreateFocusTaskParams {
	readonly title: string;
	readonly order?: number;
	readonly id?: string;
	readonly createdAt?: number;
}

/**
 * Validates and trims a task title.
 * Throws InvalidTaskTitleError if the title is empty after trimming or exceeds TASK_TITLE_MAX_LENGTH.
 */
export function validateTaskTitle(title: string): string {
	if (typeof title !== 'string') {
		throw new InvalidTaskTitleError('Task title must be a string.');
	}

	const trimmed = title.trim();

	if (trimmed.length === 0) {
		throw new InvalidTaskTitleError('Task title cannot be empty.');
	}

	if (trimmed.length > TASK_TITLE_MAX_LENGTH) {
		throw new InvalidTaskTitleError(
			`Task title cannot exceed ${TASK_TITLE_MAX_LENGTH} characters.`
		);
	}

	return trimmed;
}

/**
 * Creates an immutable FocusTask instance.
 * Defaults:
 * - id: crypto.randomUUID()
 * - completed: false
 * - createdAt: Date.now()
 * - order: 0
 */
export function createFocusTask(params: CreateFocusTaskParams): FocusTask {
	const trimmedTitle = validateTaskTitle(params.title);

	const task: FocusTask = {
		id: params.id ?? crypto.randomUUID(),
		title: trimmedTitle,
		completed: false,
		createdAt: params.createdAt ?? Date.now(),
		order: params.order ?? 0
	};

	return Object.freeze(task);
}

/**
 * Toggles a task completion status.
 * If completed -> completed: false, completedAt: undefined.
 * If pending -> completed: true, completedAt: now ?? Date.now().
 */
export function toggleFocusTask(task: FocusTask, now?: number): FocusTask {
	if (task.completed) {
		return Object.freeze({
			...task,
			completed: false,
			completedAt: undefined
		});
	}

	return Object.freeze({
		...task,
		completed: true,
		completedAt: now ?? Date.now()
	});
}

/**
 * Updates the title of an existing FocusTask after validation.
 */
export function updateFocusTaskTitle(task: FocusTask, newTitle: string): FocusTask {
	const trimmedTitle = validateTaskTitle(newTitle);

	return Object.freeze({
		...task,
		title: trimmedTitle
	});
}

/**
 * Reorders tasks matching the orderedIds sequence, setting sequential orders starting at 0.
 * Any tasks not included in orderedIds stay appended at the end with sequential orders.
 */
export function reorderFocusTasks(
	tasks: readonly FocusTask[],
	orderedIds: readonly string[]
): readonly FocusTask[] {
	const taskMap = new Map<string, FocusTask>();
	for (const task of tasks) {
		taskMap.set(task.id, task);
	}

	const reordered: FocusTask[] = [];
	const seenIds = new Set<string>();

	for (const id of orderedIds) {
		const task = taskMap.get(id);
		if (task && !seenIds.has(id)) {
			seenIds.add(id);
			reordered.push(task);
		}
	}

	for (const task of tasks) {
		if (!seenIds.has(task.id)) {
			seenIds.add(task.id);
			reordered.push(task);
		}
	}

	return Object.freeze(
		reordered.map((task, index) =>
			Object.freeze({
				...task,
				order: index
			})
		)
	);
}
