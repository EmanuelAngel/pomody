import { createFocusTask, type FocusTask } from '$lib/domain/tasks/task.entity';

/**
 * Creates a valid FocusTask fixture with sensible defaults.
 */
export function createTaskFixture(
	overrides: Partial<Parameters<typeof createFocusTask>[0]> = {}
): FocusTask {
	return createFocusTask({
		id: 'task-fixture-1',
		title: 'Sample Focus Task',
		order: 0,
		createdAt: 1000,
		...overrides
	});
}

/**
 * Creates a frozen list of valid FocusTask fixtures with sequential IDs and ordering.
 */
export function createTaskListFixture(
	count: number,
	baseOverrides: Partial<Parameters<typeof createFocusTask>[0]> = {}
): readonly FocusTask[] {
	const tasks: FocusTask[] = [];

	for (let i = 0; i < count; i++) {
		const id = baseOverrides.id
			? count === 1
				? baseOverrides.id
				: `${baseOverrides.id}-${i + 1}`
			: `task-fixture-${i + 1}`;

		const order = baseOverrides.order !== undefined ? baseOverrides.order + i : i;

		tasks.push(
			createTaskFixture({
				...baseOverrides,
				id,
				order
			})
		);
	}

	return Object.freeze(tasks);
}
