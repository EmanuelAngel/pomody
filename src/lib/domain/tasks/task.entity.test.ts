import { describe, it, expect } from 'vitest';
import {
	TASK_TITLE_MAX_LENGTH,
	InvalidTaskTitleError,
	validateTaskTitle,
	createFocusTask,
	toggleFocusTask,
	updateFocusTaskTitle,
	reorderFocusTasks
} from './task.entity';

describe('FocusTask Domain Entity', () => {
	describe('validateTaskTitle', () => {
		it('should trim leading and trailing whitespace', () => {
			expect(validateTaskTitle('   Write unit tests   ')).toBe('Write unit tests');
		});

		it('should accept a title at the maximum length boundary (120 characters)', () => {
			const maxTitle = 'a'.repeat(TASK_TITLE_MAX_LENGTH);
			expect(validateTaskTitle(maxTitle)).toBe(maxTitle);
		});

		it('should throw InvalidTaskTitleError if title is empty string', () => {
			expect(() => validateTaskTitle('')).toThrow(InvalidTaskTitleError);
			expect(() => validateTaskTitle('')).toThrow('Task title cannot be empty.');
		});

		it('should throw InvalidTaskTitleError if title only contains whitespace', () => {
			expect(() => validateTaskTitle('   \t\n  ')).toThrow(InvalidTaskTitleError);
		});

		it('should throw InvalidTaskTitleError if title exceeds 120 characters after trimming', () => {
			const tooLongTitle = 'a'.repeat(TASK_TITLE_MAX_LENGTH + 1);
			expect(() => validateTaskTitle(tooLongTitle)).toThrow(InvalidTaskTitleError);
			expect(() => validateTaskTitle(tooLongTitle)).toThrow(
				`Task title cannot exceed ${TASK_TITLE_MAX_LENGTH} characters.`
			);
		});

		it('should throw InvalidTaskTitleError if input is not a string', () => {
			// @ts-expect-error testing runtime validation
			expect(() => validateTaskTitle(null)).toThrow(InvalidTaskTitleError);
			// @ts-expect-error testing runtime validation
			expect(() => validateTaskTitle(undefined)).toThrow(InvalidTaskTitleError);
			// @ts-expect-error testing runtime validation
			expect(() => validateTaskTitle(12345)).toThrow(InvalidTaskTitleError);
		});
	});

	describe('createFocusTask', () => {
		it('should create a focus task with default values', () => {
			const before = Date.now();
			const task = createFocusTask({ title: 'Read DDD book' });
			const after = Date.now();

			expect(task.id).toBeDefined();
			expect(typeof task.id).toBe('string');
			expect(task.id.length).toBeGreaterThan(0);
			expect(task.title).toBe('Read DDD book');
			expect(task.completed).toBe(false);
			expect(task.order).toBe(0);
			expect(task.createdAt).toBeGreaterThanOrEqual(before);
			expect(task.createdAt).toBeLessThanOrEqual(after);
			expect(task.completedAt).toBeUndefined();
		});

		it('should trim title when creating a task', () => {
			const task = createFocusTask({ title: '   Clean architecture   ' });
			expect(task.title).toBe('Clean architecture');
		});

		it('should use explicit id, order, and createdAt if provided', () => {
			const customId = 'custom-uuid-123';
			const customCreatedAt = 1700000000000;
			const task = createFocusTask({
				title: 'Write hexagonal ports',
				id: customId,
				order: 3,
				createdAt: customCreatedAt
			});

			expect(task.id).toBe(customId);
			expect(task.order).toBe(3);
			expect(task.createdAt).toBe(customCreatedAt);
		});

		it('should return a frozen, immutable object', () => {
			const task = createFocusTask({ title: 'Immutability test' });

			expect(Object.isFrozen(task)).toBe(true);
			// @ts-expect-error verifying mutation throws in strict mode
			expect(() => (task.title = 'Mutated')).toThrow();
			// @ts-expect-error verifying mutation throws in strict mode
			expect(() => (task.completed = true)).toThrow();
		});

		it('should throw InvalidTaskTitleError if title is invalid during creation', () => {
			expect(() => createFocusTask({ title: '   ' })).toThrow(InvalidTaskTitleError);
		});
	});

	describe('toggleFocusTask', () => {
		it('should complete an uncompleted task with current timestamp', () => {
			const task = createFocusTask({ title: 'Pending task' });
			const now = 1700000050000;

			const completedTask = toggleFocusTask(task, now);

			expect(completedTask.completed).toBe(true);
			expect(completedTask.completedAt).toBe(now);
			expect(completedTask.id).toBe(task.id);
			expect(completedTask.title).toBe(task.title);
			expect(completedTask.order).toBe(task.order);
			expect(completedTask.createdAt).toBe(task.createdAt);
			expect(Object.isFrozen(completedTask)).toBe(true);
			expect(task.completed).toBe(false); // original untouched
		});

		it('should use Date.now() if now timestamp is not provided when completing', () => {
			const task = createFocusTask({ title: 'Pending task' });
			const before = Date.now();
			const completedTask = toggleFocusTask(task);
			const after = Date.now();

			expect(completedTask.completed).toBe(true);
			expect(completedTask.completedAt).toBeGreaterThanOrEqual(before);
			expect(completedTask.completedAt).toBeLessThanOrEqual(after);
		});

		it('should uncomplete a completed task and reset completedAt to undefined', () => {
			const task = createFocusTask({ title: 'Done task' });
			const completed = toggleFocusTask(task, 1700000050000);

			const uncompletedTask = toggleFocusTask(completed);

			expect(uncompletedTask.completed).toBe(false);
			expect(uncompletedTask.completedAt).toBeUndefined();
			expect(Object.isFrozen(uncompletedTask)).toBe(true);
			expect(completed.completed).toBe(true); // original untouched
		});
	});

	describe('updateFocusTaskTitle', () => {
		it('should update task title with trimmed input', () => {
			const task = createFocusTask({ title: 'Old title', order: 1 });
			const updated = updateFocusTaskTitle(task, '   Updated new title   ');

			expect(updated.title).toBe('Updated new title');
			expect(updated.id).toBe(task.id);
			expect(updated.order).toBe(1);
			expect(updated.completed).toBe(false);
			expect(Object.isFrozen(updated)).toBe(true);
			expect(task.title).toBe('Old title'); // original untouched
		});

		it('should throw InvalidTaskTitleError if new title is empty or invalid', () => {
			const task = createFocusTask({ title: 'Valid task' });

			expect(() => updateFocusTaskTitle(task, '   ')).toThrow(InvalidTaskTitleError);
			expect(() => updateFocusTaskTitle(task, 'x'.repeat(TASK_TITLE_MAX_LENGTH + 1))).toThrow(
				InvalidTaskTitleError
			);
			expect(task.title).toBe('Valid task'); // untouched
		});
	});

	describe('reorderFocusTasks', () => {
		const taskA = createFocusTask({ id: 'id-a', title: 'Task A', order: 0 });
		const taskB = createFocusTask({ id: 'id-b', title: 'Task B', order: 1 });
		const taskC = createFocusTask({ id: 'id-c', title: 'Task C', order: 2 });
		const taskD = createFocusTask({ id: 'id-d', title: 'Task D', order: 3 });

		it('should reorder tasks according to orderedIds sequence and set sequential orders', () => {
			const initialTasks = [taskA, taskB, taskC, taskD];
			const reordered = reorderFocusTasks(initialTasks, ['id-c', 'id-a', 'id-d', 'id-b']);

			expect(reordered.map((t) => t.id)).toEqual(['id-c', 'id-a', 'id-d', 'id-b']);
			expect(reordered.map((t) => t.order)).toEqual([0, 1, 2, 3]);
			expect(Object.isFrozen(reordered)).toBe(true);
			reordered.forEach((t) => expect(Object.isFrozen(t)).toBe(true));
		});

		it('should append tasks omitted from orderedIds at the end in their original relative sequence', () => {
			const initialTasks = [taskA, taskB, taskC, taskD];
			// Only specify id-c and id-a
			const reordered = reorderFocusTasks(initialTasks, ['id-c', 'id-a']);

			expect(reordered.map((t) => t.id)).toEqual(['id-c', 'id-a', 'id-b', 'id-d']);
			expect(reordered.map((t) => t.order)).toEqual([0, 1, 2, 3]);
		});

		it('should ignore non-existent IDs in orderedIds', () => {
			const initialTasks = [taskA, taskB];
			const reordered = reorderFocusTasks(initialTasks, ['non-existent', 'id-b', 'another-bad-id']);

			expect(reordered.map((t) => t.id)).toEqual(['id-b', 'id-a']);
			expect(reordered.map((t) => t.order)).toEqual([0, 1]);
		});

		it('should deduplicate IDs if orderedIds contains duplicates', () => {
			const initialTasks = [taskA, taskB, taskC];
			const reordered = reorderFocusTasks(initialTasks, ['id-b', 'id-b', 'id-c']);

			expect(reordered.map((t) => t.id)).toEqual(['id-b', 'id-c', 'id-a']);
			expect(reordered.map((t) => t.order)).toEqual([0, 1, 2]);
		});

		it('should handle empty tasks array', () => {
			const reordered = reorderFocusTasks([], ['id-a', 'id-b']);
			expect(reordered).toEqual([]);
			expect(Object.isFrozen(reordered)).toBe(true);
		});

		it('should reassign sequential orders even if orderedIds is empty', () => {
			const unorderedTasks = [
				createFocusTask({ id: '1', title: 'Task 1', order: 10 }),
				createFocusTask({ id: '2', title: 'Task 2', order: 50 })
			];

			const reordered = reorderFocusTasks(unorderedTasks, []);
			expect(reordered.map((t) => t.id)).toEqual(['1', '2']);
			expect(reordered.map((t) => t.order)).toEqual([0, 1]);
		});

		it('should not mutate original tasks or original array', () => {
			const initial = [taskA, taskB];
			const reordered = reorderFocusTasks(initial, ['id-b', 'id-a']);

			expect(initial[0].id).toBe('id-a');
			expect(initial[1].id).toBe('id-b');
			expect(reordered[0].id).toBe('id-b');
			expect(reordered[0].order).toBe(0);
			expect(taskB.order).toBe(1);
		});
	});
});
