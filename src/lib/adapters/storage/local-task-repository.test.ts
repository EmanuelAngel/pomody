import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
	LocalStorageTaskRepository,
	sanitizeTask,
	TASKS_STORAGE_KEY,
	TASKS_STORAGE_VERSION,
	type StoredTasksEnvelope
} from './local-task-repository';
import { createFocusTask, toggleFocusTask, type FocusTask } from '../../domain/tasks/task.entity';

function createMockStorage(initialData: Record<string, string> = {}): Storage {
	const map = new Map<string, string>(Object.entries(initialData));

	return {
		get length(): number {
			return map.size;
		},
		clear(): void {
			map.clear();
		},
		getItem(key: string): string | null {
			return map.get(key) ?? null;
		},
		key(index: number): string | null {
			return Array.from(map.keys())[index] ?? null;
		},
		removeItem(key: string): void {
			map.delete(key);
		},
		setItem(key: string, value: string): void {
			map.set(key, String(value));
		}
	};
}

describe('LocalStorageTaskRepository', () => {
	let mockStorage: Storage;
	let repository: LocalStorageTaskRepository;

	beforeEach(() => {
		mockStorage = createMockStorage();
		repository = new LocalStorageTaskRepository(mockStorage);
	});

	describe('sanitizeTask', () => {
		it('returns a frozen FocusTask for valid input', () => {
			const raw = {
				id: 'task-1',
				title: '  Complete TASK-03  ',
				completed: false,
				createdAt: 1000,
				order: 0
			};

			const sanitized = sanitizeTask(raw);
			expect(sanitized).not.toBeNull();
			expect(sanitized).toEqual({
				id: 'task-1',
				title: 'Complete TASK-03',
				completed: false,
				createdAt: 1000,
				order: 0
			});
			expect(Object.isFrozen(sanitized)).toBe(true);
		});

		it('preserves valid completedAt timestamp', () => {
			const raw = {
				id: 'task-1',
				title: 'Done task',
				completed: true,
				createdAt: 1000,
				order: 0,
				completedAt: 2000
			};

			const sanitized = sanitizeTask(raw);
			expect(sanitized).not.toBeNull();
			expect(sanitized?.completedAt).toBe(2000);
		});

		it('returns null if input is not an object or null', () => {
			expect(sanitizeTask(null)).toBeNull();
			expect(sanitizeTask(undefined)).toBeNull();
			expect(sanitizeTask('not-an-object')).toBeNull();
			expect(sanitizeTask(123)).toBeNull();
			expect(sanitizeTask(true)).toBeNull();
		});

		it('returns null if id is invalid (missing, non-string, empty, or whitespace-only)', () => {
			expect(sanitizeTask({ title: 'Task', completed: false, createdAt: 10, order: 0 })).toBeNull();
			expect(
				sanitizeTask({ id: 123, title: 'Task', completed: false, createdAt: 10, order: 0 })
			).toBeNull();
			expect(
				sanitizeTask({ id: '', title: 'Task', completed: false, createdAt: 10, order: 0 })
			).toBeNull();
			expect(
				sanitizeTask({ id: '   ', title: 'Task', completed: false, createdAt: 10, order: 0 })
			).toBeNull();
		});

		it('returns null if title is invalid (non-string, empty, whitespace-only, or > 120 chars)', () => {
			expect(
				sanitizeTask({ id: 't1', title: 123, completed: false, createdAt: 10, order: 0 })
			).toBeNull();
			expect(
				sanitizeTask({ id: 't1', title: '', completed: false, createdAt: 10, order: 0 })
			).toBeNull();
			expect(
				sanitizeTask({ id: 't1', title: '   ', completed: false, createdAt: 10, order: 0 })
			).toBeNull();
			expect(
				sanitizeTask({
					id: 't1',
					title: 'a'.repeat(121),
					completed: false,
					createdAt: 10,
					order: 0
				})
			).toBeNull();
		});

		it('accepts title up to 120 characters', () => {
			const maxTitle = 'a'.repeat(120);
			const sanitized = sanitizeTask({
				id: 't1',
				title: maxTitle,
				completed: false,
				createdAt: 10,
				order: 0
			});
			expect(sanitized).not.toBeNull();
			expect(sanitized?.title).toBe(maxTitle);
		});

		it('returns null if completed is not a boolean', () => {
			expect(
				sanitizeTask({ id: 't1', title: 'Task', completed: 'true', createdAt: 10, order: 0 })
			).toBeNull();
			expect(
				sanitizeTask({ id: 't1', title: 'Task', completed: 1, createdAt: 10, order: 0 })
			).toBeNull();
			expect(
				sanitizeTask({ id: 't1', title: 'Task', completed: null, createdAt: 10, order: 0 })
			).toBeNull();
		});

		it('returns null if createdAt is invalid (non-number, NaN, non-finite, <= 0)', () => {
			expect(
				sanitizeTask({ id: 't1', title: 'Task', completed: false, createdAt: '100', order: 0 })
			).toBeNull();
			expect(
				sanitizeTask({ id: 't1', title: 'Task', completed: false, createdAt: NaN, order: 0 })
			).toBeNull();
			expect(
				sanitizeTask({ id: 't1', title: 'Task', completed: false, createdAt: Infinity, order: 0 })
			).toBeNull();
			expect(
				sanitizeTask({ id: 't1', title: 'Task', completed: false, createdAt: 0, order: 0 })
			).toBeNull();
			expect(
				sanitizeTask({ id: 't1', title: 'Task', completed: false, createdAt: -100, order: 0 })
			).toBeNull();
		});

		it('returns null if order is invalid (non-integer, negative, NaN, non-number)', () => {
			expect(
				sanitizeTask({ id: 't1', title: 'Task', completed: false, createdAt: 10, order: 1.5 })
			).toBeNull();
			expect(
				sanitizeTask({ id: 't1', title: 'Task', completed: false, createdAt: 10, order: -1 })
			).toBeNull();
			expect(
				sanitizeTask({ id: 't1', title: 'Task', completed: false, createdAt: 10, order: '0' })
			).toBeNull();
			expect(
				sanitizeTask({ id: 't1', title: 'Task', completed: false, createdAt: 10, order: NaN })
			).toBeNull();
		});

		it('returns null if completedAt is present but invalid (<= 0, non-number, null, NaN)', () => {
			expect(
				sanitizeTask({
					id: 't1',
					title: 'Task',
					completed: true,
					createdAt: 10,
					order: 0,
					completedAt: 0
				})
			).toBeNull();
			expect(
				sanitizeTask({
					id: 't1',
					title: 'Task',
					completed: true,
					createdAt: 10,
					order: 0,
					completedAt: -50
				})
			).toBeNull();
			expect(
				sanitizeTask({
					id: 't1',
					title: 'Task',
					completed: true,
					createdAt: 10,
					order: 0,
					completedAt: '2000'
				})
			).toBeNull();
			expect(
				sanitizeTask({
					id: 't1',
					title: 'Task',
					completed: true,
					createdAt: 10,
					order: 0,
					completedAt: null
				})
			).toBeNull();
			expect(
				sanitizeTask({
					id: 't1',
					title: 'Task',
					completed: true,
					createdAt: 10,
					order: 0,
					completedAt: NaN
				})
			).toBeNull();
		});
	});

	describe('Basic CRUD Operations', () => {
		it('returns empty array when storage is initially empty', async () => {
			expect(await repository.getAll()).toEqual([]);
			expect(await repository.getPending()).toEqual([]);
		});

		it('saves and retrieves a single task', async () => {
			const task = createFocusTask({ id: 't1', title: 'My Task', order: 0, createdAt: 1000 });
			await repository.save(task);

			const all = await repository.getAll();
			expect(all).toHaveLength(1);
			expect(all[0]).toEqual(task);

			const raw = mockStorage.getItem(TASKS_STORAGE_KEY);
			expect(raw).not.toBeNull();
			const envelope: StoredTasksEnvelope = JSON.parse(raw!);
			expect(envelope.version).toBe(TASKS_STORAGE_VERSION);
			expect(envelope.tasks).toHaveLength(1);
			expect(envelope.tasks[0]).toEqual(task);
		});

		it('upserts existing task on save', async () => {
			const task1 = createFocusTask({
				id: 't1',
				title: 'Initial Title',
				order: 0,
				createdAt: 1000
			});
			await repository.save(task1);

			const updatedTask1 = { ...task1, title: 'Updated Title' };
			await repository.save(updatedTask1);

			const all = await repository.getAll();
			expect(all).toHaveLength(1);
			expect(all[0].title).toBe('Updated Title');
		});

		it('deletes a task by id', async () => {
			const task1 = createFocusTask({ id: 't1', title: 'Task 1', order: 0, createdAt: 1000 });
			const task2 = createFocusTask({ id: 't2', title: 'Task 2', order: 1, createdAt: 2000 });
			await repository.saveBatch([task1, task2]);

			await repository.delete('t1');

			const all = await repository.getAll();
			expect(all).toHaveLength(1);
			expect(all[0].id).toBe('t2');
		});

		it('handles deleting a non-existent task gracefully without error', async () => {
			const task1 = createFocusTask({ id: 't1', title: 'Task 1', order: 0, createdAt: 1000 });
			await repository.save(task1);

			await repository.delete('non-existent-id');

			const all = await repository.getAll();
			expect(all).toHaveLength(1);
			expect(all[0].id).toBe('t1');
		});

		it('getPending returns only uncompleted tasks', async () => {
			const task1 = createFocusTask({ id: 't1', title: 'Task 1', order: 0, createdAt: 1000 });
			const task2 = createFocusTask({ id: 't2', title: 'Task 2', order: 1, createdAt: 2000 });
			const completedTask2 = toggleFocusTask(task2);

			await repository.saveBatch([task1, completedTask2]);

			const all = await repository.getAll();
			expect(all).toHaveLength(2);

			const pending = await repository.getPending();
			expect(pending).toHaveLength(1);
			expect(pending[0].id).toBe('t1');
		});
	});

	describe('Batch Save Operations', () => {
		it('saves a batch of new tasks', async () => {
			const task1 = createFocusTask({ id: 't1', title: 'Task 1', order: 1, createdAt: 100 });
			const task2 = createFocusTask({ id: 't2', title: 'Task 2', order: 0, createdAt: 200 });

			await repository.saveBatch([task1, task2]);

			const all = await repository.getAll();
			expect(all).toHaveLength(2);
			expect(all.map((t) => t.id)).toEqual(['t2', 't1']);
		});

		it('upserts existing tasks and adds new ones in a single batch', async () => {
			const task1 = createFocusTask({ id: 't1', title: 'Task 1', order: 0, createdAt: 100 });
			await repository.save(task1);

			const updatedTask1 = { ...task1, title: 'Task 1 Revised' };
			const task2 = createFocusTask({ id: 't2', title: 'Task 2', order: 1, createdAt: 200 });

			await repository.saveBatch([updatedTask1, task2]);

			const all = await repository.getAll();
			expect(all).toHaveLength(2);
			expect(all.find((t) => t.id === 't1')?.title).toBe('Task 1 Revised');
			expect(all.find((t) => t.id === 't2')?.title).toBe('Task 2');
		});

		it('handles empty batch as a no-op without altering storage', async () => {
			const task1 = createFocusTask({ id: 't1', title: 'Task 1', order: 0, createdAt: 100 });
			await repository.save(task1);

			await repository.saveBatch([]);

			const all = await repository.getAll();
			expect(all).toHaveLength(1);
			expect(all[0].id).toBe('t1');
		});
	});

	describe('Sorting Guarantees', () => {
		it('deterministically sorts getAll by order ascending, then createdAt ascending', async () => {
			const taskA = createFocusTask({
				id: 'a',
				title: 'Order 2 Created 500',
				order: 2,
				createdAt: 500
			});
			const taskB = createFocusTask({
				id: 'b',
				title: 'Order 1 Created 200',
				order: 1,
				createdAt: 200
			});
			const taskC = createFocusTask({
				id: 'c',
				title: 'Order 1 Created 100',
				order: 1,
				createdAt: 100
			});
			const taskD = createFocusTask({
				id: 'd',
				title: 'Order 3 Created 50',
				order: 3,
				createdAt: 50
			});

			await repository.saveBatch([taskA, taskB, taskC, taskD]);

			const all = await repository.getAll();
			expect(all.map((t) => t.id)).toEqual(['c', 'b', 'a', 'd']);
			expect(Object.isFrozen(all)).toBe(true);
		});

		it('deterministically sorts getPending by order ascending, then createdAt ascending', async () => {
			const taskA = createFocusTask({
				id: 'a',
				title: 'Order 2 Created 500',
				order: 2,
				createdAt: 500
			});
			const taskB = createFocusTask({
				id: 'b',
				title: 'Order 1 Created 200',
				order: 1,
				createdAt: 200
			});
			const taskC = createFocusTask({
				id: 'c',
				title: 'Order 1 Created 100',
				order: 1,
				createdAt: 100
			});
			const completedTaskC = toggleFocusTask(taskC);

			await repository.saveBatch([taskA, taskB, completedTaskC]);

			const pending = await repository.getPending();
			expect(pending.map((t) => t.id)).toEqual(['b', 'a']);
			expect(Object.isFrozen(pending)).toBe(true);
		});
	});

	describe('clearCompleted', () => {
		it('only removes completed tasks while preserving pending tasks', async () => {
			const task1 = createFocusTask({ id: 't1', title: 'Pending 1', order: 0, createdAt: 100 });
			const task2 = createFocusTask({ id: 't2', title: 'Pending 2', order: 1, createdAt: 200 });
			const task3 = createFocusTask({ id: 't3', title: 'To Complete', order: 2, createdAt: 300 });
			const completedTask3 = toggleFocusTask(task3);

			await repository.saveBatch([task1, task2, completedTask3]);

			await repository.clearCompleted();

			const remaining = await repository.getAll();
			expect(remaining.map((t) => t.id)).toEqual(['t1', 't2']);
		});

		it('is safe to call when no completed tasks exist', async () => {
			const task1 = createFocusTask({ id: 't1', title: 'Pending', order: 0, createdAt: 100 });
			await repository.save(task1);

			await repository.clearCompleted();

			const remaining = await repository.getAll();
			expect(remaining).toHaveLength(1);
			expect(remaining[0].id).toBe('t1');
		});
	});

	describe('clearAll', () => {
		it('removes tasks key without touching other keys such as pomody:settings', async () => {
			mockStorage.setItem('pomody:settings', JSON.stringify({ version: 1, theme: 'dawn' }));
			const task = createFocusTask({ id: 't1', title: 'Task', order: 0, createdAt: 100 });
			await repository.save(task);

			expect(mockStorage.getItem(TASKS_STORAGE_KEY)).not.toBeNull();
			expect(mockStorage.getItem('pomody:settings')).not.toBeNull();

			await repository.clearAll();

			expect(mockStorage.getItem(TASKS_STORAGE_KEY)).toBeNull();
			expect(mockStorage.getItem('pomody:settings')).toBe(
				JSON.stringify({ version: 1, theme: 'dawn' })
			);
			expect(await repository.getAll()).toEqual([]);
		});
	});

	describe('Defensive Handling and Resilience', () => {
		it('returns empty array when stored payload is malformed JSON', async () => {
			mockStorage.setItem(TASKS_STORAGE_KEY, '{invalid-json');

			const all = await repository.getAll();
			expect(all).toEqual([]);
		});

		it('returns empty array when stored JSON is a primitive or null', async () => {
			mockStorage.setItem(TASKS_STORAGE_KEY, 'null');
			expect(await repository.getAll()).toEqual([]);

			mockStorage.setItem(TASKS_STORAGE_KEY, '"hello"');
			expect(await repository.getAll()).toEqual([]);

			mockStorage.setItem(TASKS_STORAGE_KEY, '42');
			expect(await repository.getAll()).toEqual([]);
		});

		it('returns empty array when envelope version is wrong or incompatible', async () => {
			mockStorage.setItem(
				TASKS_STORAGE_KEY,
				JSON.stringify({
					version: 99,
					tasks: [{ id: 't1', title: 'Task', completed: false, createdAt: 10, order: 0 }]
				})
			);

			const all = await repository.getAll();
			expect(all).toEqual([]);
		});

		it('returns empty array when envelope tasks property is not an array', async () => {
			mockStorage.setItem(
				TASKS_STORAGE_KEY,
				JSON.stringify({
					version: TASKS_STORAGE_VERSION,
					tasks: 'not-an-array'
				})
			);

			const all = await repository.getAll();
			expect(all).toEqual([]);
		});

		it('filters out corrupted tasks in envelope and preserves valid ones', async () => {
			const validTask = {
				id: 'valid-1',
				title: 'Valid Task',
				completed: false,
				createdAt: 1000,
				order: 0
			};
			const corruptNull = null;
			const corruptMissingTitle = {
				id: 'corrupt-2',
				completed: false,
				createdAt: 1000,
				order: 1
			};
			const corruptInvalidCreatedAt = {
				id: 'corrupt-3',
				title: 'Bad CreatedAt',
				completed: false,
				createdAt: -50,
				order: 2
			};

			mockStorage.setItem(
				TASKS_STORAGE_KEY,
				JSON.stringify({
					version: TASKS_STORAGE_VERSION,
					tasks: [corruptNull, validTask, corruptMissingTitle, corruptInvalidCreatedAt]
				})
			);

			const all = await repository.getAll();
			expect(all).toHaveLength(1);
			expect(all[0].id).toBe('valid-1');
		});

		it('handles SSR / Node environment where window and localStorage are undefined', async () => {
			const ssrRepo = new LocalStorageTaskRepository(undefined);

			expect(ssrRepo.getStorage()).toBeNull();
			expect(await ssrRepo.getAll()).toEqual([]);
			expect(await ssrRepo.getPending()).toEqual([]);

			const task = createFocusTask({ id: 't1', title: 'SSR Task' });
			await expect(ssrRepo.save(task)).resolves.not.toThrow();
			await expect(ssrRepo.saveBatch([task])).resolves.not.toThrow();
			await expect(ssrRepo.delete('t1')).resolves.not.toThrow();
			await expect(ssrRepo.clearCompleted()).resolves.not.toThrow();
			await expect(ssrRepo.clearAll()).resolves.not.toThrow();
		});

		it('handles SecurityError on getItem gracefully without throwing', async () => {
			const throwingStorage: Storage = {
				...mockStorage,
				getItem: vi.fn().mockImplementation(() => {
					throw new DOMException('The operation is insecure.', 'SecurityError');
				})
			};

			const repo = new LocalStorageTaskRepository(throwingStorage);
			expect(await repo.getAll()).toEqual([]);
			expect(await repo.getPending()).toEqual([]);
		});

		it('handles QuotaExceededError or DOMException on setItem gracefully without throwing', async () => {
			const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
			const throwingStorage: Storage = {
				...mockStorage,
				setItem: vi.fn().mockImplementation(() => {
					throw new DOMException('The quota has been exceeded.', 'QuotaExceededError');
				})
			};

			const repo = new LocalStorageTaskRepository(throwingStorage);
			const task = createFocusTask({ id: 't1', title: 'Task' });

			await expect(repo.save(task)).resolves.not.toThrow();
			await expect(repo.saveBatch([task])).resolves.not.toThrow();
			await expect(repo.delete('t1')).resolves.not.toThrow();
			await expect(repo.clearCompleted()).resolves.not.toThrow();

			consoleErrorSpy.mockRestore();
		});

		it('logs console.error when storage.setItem throws QuotaExceededError or SecurityError', async () => {
			const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
			const quotaError = new DOMException('The quota has been exceeded.', 'QuotaExceededError');
			const throwingStorage: Storage = {
				...mockStorage,
				setItem: vi.fn().mockImplementation(() => {
					throw quotaError;
				})
			};

			const repo = new LocalStorageTaskRepository(throwingStorage);
			const task = createFocusTask({ id: 't1', title: 'Task' });

			await repo.save(task);
			expect(consoleErrorSpy).toHaveBeenCalledWith('Failed to write tasks to storage:', quotaError);

			const securityError = new DOMException('The operation is insecure.', 'SecurityError');
			throwingStorage.setItem = vi.fn().mockImplementation(() => {
				throw securityError;
			});

			await repo.delete('t1');
			expect(consoleErrorSpy).toHaveBeenCalledWith(
				'Failed to write tasks to storage:',
				securityError
			);

			consoleErrorSpy.mockRestore();
		});

		it('returns null if accessing window.localStorage throws a SecurityError or DOMException', () => {
			const originalWindow = globalThis.window;
			try {
				const restrictedWindow = {} as Window & typeof globalThis;
				Object.defineProperty(restrictedWindow, 'localStorage', {
					get() {
						throw new DOMException('The operation is insecure.', 'SecurityError');
					},
					configurable: true
				});
				(globalThis as unknown as { window: unknown }).window = restrictedWindow;

				const repo = new LocalStorageTaskRepository();
				expect(repo.getStorage()).toBeNull();
			} finally {
				if (originalWindow === undefined) {
					delete (globalThis as unknown as { window?: unknown }).window;
				} else {
					(globalThis as unknown as { window: unknown }).window = originalWindow;
				}
			}
		});

		it('does not overwrite newer storage envelope versions on save, delete, or saveBatch and logs a warning', async () => {
			const consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
			const v2Envelope = JSON.stringify({
				version: 2,
				tasks: [
					{
						id: 'v2-task-1',
						title: 'Future Task',
						completed: false,
						createdAt: 1000,
						order: 0
					}
				]
			});
			mockStorage.setItem(TASKS_STORAGE_KEY, v2Envelope);

			const task = createFocusTask({ id: 't1', title: 'New Task 1' });

			// 1. save() should NOT overwrite v2 envelope
			await repository.save(task);
			expect(mockStorage.getItem(TASKS_STORAGE_KEY)).toBe(v2Envelope);
			expect(consoleWarnSpy).toHaveBeenCalledTimes(1);

			// 2. delete() should NOT overwrite v2 envelope
			await repository.delete('v2-task-1');
			expect(mockStorage.getItem(TASKS_STORAGE_KEY)).toBe(v2Envelope);
			expect(consoleWarnSpy).toHaveBeenCalledTimes(2);

			// 3. saveBatch() should NOT overwrite v2 envelope
			const task2 = createFocusTask({ id: 't2', title: 'Batch Task' });
			await repository.saveBatch([task2]);
			expect(mockStorage.getItem(TASKS_STORAGE_KEY)).toBe(v2Envelope);
			expect(consoleWarnSpy).toHaveBeenCalledTimes(3);

			// 4. clearCompleted() should NOT overwrite v2 envelope
			await repository.clearCompleted();
			expect(mockStorage.getItem(TASKS_STORAGE_KEY)).toBe(v2Envelope);
			expect(consoleWarnSpy).toHaveBeenCalledTimes(4);

			consoleWarnSpy.mockRestore();
		});

		it('handles SecurityError on removeItem gracefully without throwing', async () => {
			const throwingStorage: Storage = {
				...mockStorage,
				removeItem: vi.fn().mockImplementation(() => {
					throw new DOMException('The operation is insecure.', 'SecurityError');
				})
			};

			const repo = new LocalStorageTaskRepository(throwingStorage);
			await expect(repo.clearAll()).resolves.not.toThrow();
		});

		it('ignores saving invalid tasks passed directly to save()', async () => {
			const invalidTask = {
				id: '',
				title: '',
				completed: false,
				createdAt: -1,
				order: -1
			} as unknown as FocusTask;

			await repository.save(invalidTask);

			expect(await repository.getAll()).toEqual([]);
			expect(mockStorage.getItem(TASKS_STORAGE_KEY)).toBeNull();
		});
	});
});
