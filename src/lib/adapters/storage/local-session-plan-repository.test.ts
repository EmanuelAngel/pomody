import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
	LocalStoragePlanRepository,
	LocalStorageSessionPlanRepository,
	InMemoryStorage,
	sanitizePlanBlock,
	sanitizeSessionPlan,
	SESSION_PLAN_STORAGE_KEY,
	SESSION_PLAN_STORAGE_VERSION,
	type StoredSessionPlanEnvelope
} from './local-session-plan-repository';
import {
	calculateSessionBudgetByBlocks,
	calculateSessionBudgetByEndTime,
	assignTaskToBlock,
	assignBreakActivityToBlock,
	updateBlockStatus,
	InvalidSessionPlanError,
	type SessionPlan
} from '../../domain/planning/session-plan.entity';
import { DEFAULT_TIMER_CONFIG } from '../../domain/timer/timer-fsm';

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

describe('InMemoryStorage', () => {
	it('supports basic Storage interface operations', () => {
		const storage = new InMemoryStorage();
		expect(storage.length).toBe(0);
		expect(storage.getItem('key1')).toBeNull();

		storage.setItem('key1', 'val1');
		expect(storage.length).toBe(1);
		expect(storage.getItem('key1')).toBe('val1');
		expect(storage.key(0)).toBe('key1');

		storage.removeItem('key1');
		expect(storage.length).toBe(0);
		expect(storage.getItem('key1')).toBeNull();

		storage.setItem('k1', 'v1');
		storage.setItem('k2', 'v2');
		expect(storage.length).toBe(2);
		storage.clear();
		expect(storage.length).toBe(0);
	});
});

describe('sanitizePlanBlock', () => {
	it('returns a frozen PlanBlock for valid input', () => {
		const raw = {
			index: 0,
			mode: 'focus',
			durationSeconds: 1500,
			status: 'pending',
			assignedTaskId: '  task-1  '
		};

		const sanitized = sanitizePlanBlock(raw);
		expect(sanitized).not.toBeNull();
		expect(sanitized).toEqual({
			index: 0,
			mode: 'focus',
			durationSeconds: 1500,
			status: 'pending',
			assignedTaskId: 'task-1'
		});
		expect(Object.isFrozen(sanitized)).toBe(true);
	});

	it('returns null if input is not an object or null', () => {
		expect(sanitizePlanBlock(null)).toBeNull();
		expect(sanitizePlanBlock(undefined)).toBeNull();
		expect(sanitizePlanBlock('not-an-object')).toBeNull();
		expect(sanitizePlanBlock(123)).toBeNull();
	});

	it('returns null if index is invalid', () => {
		expect(
			sanitizePlanBlock({ index: -1, mode: 'focus', durationSeconds: 1500, status: 'pending' })
		).toBeNull();
		expect(
			sanitizePlanBlock({ index: 1.5, mode: 'focus', durationSeconds: 1500, status: 'pending' })
		).toBeNull();
		expect(
			sanitizePlanBlock({ index: '0', mode: 'focus', durationSeconds: 1500, status: 'pending' })
		).toBeNull();
	});

	it('returns null if mode is invalid', () => {
		expect(
			sanitizePlanBlock({ index: 0, mode: 'invalidMode', durationSeconds: 1500, status: 'pending' })
		).toBeNull();
	});

	it('returns null if durationSeconds is invalid', () => {
		expect(
			sanitizePlanBlock({ index: 0, mode: 'focus', durationSeconds: 0, status: 'pending' })
		).toBeNull();
		expect(
			sanitizePlanBlock({ index: 0, mode: 'focus', durationSeconds: -50, status: 'pending' })
		).toBeNull();
		expect(
			sanitizePlanBlock({ index: 0, mode: 'focus', durationSeconds: 1500.5, status: 'pending' })
		).toBeNull();
	});

	it('returns null if status is invalid', () => {
		expect(
			sanitizePlanBlock({ index: 0, mode: 'focus', durationSeconds: 1500, status: 'unknown' })
		).toBeNull();
	});

	it('handles assignedTaskId and assignedBreakActivityId trimming and invalid types', () => {
		expect(
			sanitizePlanBlock({
				index: 0,
				mode: 'focus',
				durationSeconds: 1500,
				status: 'pending',
				assignedTaskId: 123
			})
		).toBeNull();
		expect(
			sanitizePlanBlock({
				index: 0,
				mode: 'focus',
				durationSeconds: 1500,
				status: 'pending',
				assignedTaskId: '   '
			})
		).toBeNull();

		expect(
			sanitizePlanBlock({
				index: 1,
				mode: 'shortBreak',
				durationSeconds: 300,
				status: 'pending',
				assignedBreakActivityId: 456
			})
		).toBeNull();
		expect(
			sanitizePlanBlock({
				index: 1,
				mode: 'shortBreak',
				durationSeconds: 300,
				status: 'pending',
				assignedBreakActivityId: '   '
			})
		).toBeNull();

		const validBreak = sanitizePlanBlock({
			index: 1,
			mode: 'shortBreak',
			durationSeconds: 300,
			status: 'pending',
			assignedBreakActivityId: '  act-hydration  '
		});
		expect(validBreak?.assignedBreakActivityId).toBe('act-hydration');
	});
});

describe('sanitizeSessionPlan', () => {
	it('returns a frozen SessionPlan for valid raw structure', () => {
		const rawPlan = calculateSessionBudgetByBlocks({
			blockCount: 2,
			sessionConfig: DEFAULT_TIMER_CONFIG
		});

		const sanitized = sanitizeSessionPlan(rawPlan);
		expect(sanitized).not.toBeNull();
		expect(sanitized?.id).toBe(rawPlan.id);
		expect(sanitized?.blocks.length).toBe(3);
		expect(Object.isFrozen(sanitized)).toBe(true);
		expect(Object.isFrozen(sanitized?.blocks)).toBe(true);
	});

	it('preserves optional timestamps', () => {
		const rawPlan = calculateSessionBudgetByEndTime({
			scheduledStartTimestamp: 10000,
			targetEndTimestamp: 20000,
			sessionConfig: DEFAULT_TIMER_CONFIG
		});

		const sanitized = sanitizeSessionPlan(rawPlan);
		expect(sanitized).not.toBeNull();
		expect(sanitized?.scheduledStartTimestamp).toBe(10000);
		expect(sanitized?.targetEndTimestamp).toBe(20000);
	});

	it('returns null if input is not an object or null', () => {
		expect(sanitizeSessionPlan(null)).toBeNull();
		expect(sanitizeSessionPlan(undefined)).toBeNull();
		expect(sanitizeSessionPlan('string')).toBeNull();
		expect(sanitizeSessionPlan(123)).toBeNull();
	});

	it('returns null if id is missing, not a string, or empty', () => {
		const base = calculateSessionBudgetByBlocks({
			blockCount: 1,
			sessionConfig: DEFAULT_TIMER_CONFIG
		});
		expect(sanitizeSessionPlan({ ...base, id: '' })).toBeNull();
		expect(sanitizeSessionPlan({ ...base, id: '   ' })).toBeNull();
		expect(sanitizeSessionPlan({ ...base, id: 123 })).toBeNull();
	});

	it('returns null if targetMode is invalid', () => {
		const base = calculateSessionBudgetByBlocks({
			blockCount: 1,
			sessionConfig: DEFAULT_TIMER_CONFIG
		});
		expect(sanitizeSessionPlan({ ...base, targetMode: 'invalid' })).toBeNull();
	});

	it('returns null if createdAt or freeMarginSeconds are invalid', () => {
		const base = calculateSessionBudgetByBlocks({
			blockCount: 1,
			sessionConfig: DEFAULT_TIMER_CONFIG
		});
		expect(sanitizeSessionPlan({ ...base, createdAt: 0 })).toBeNull();
		expect(sanitizeSessionPlan({ ...base, createdAt: -100 })).toBeNull();
		expect(sanitizeSessionPlan({ ...base, createdAt: '100' })).toBeNull();
		expect(sanitizeSessionPlan({ ...base, freeMarginSeconds: -1 })).toBeNull();
		expect(sanitizeSessionPlan({ ...base, freeMarginSeconds: 'zero' })).toBeNull();
	});

	it('returns null if optional timestamps are non-finite or inverted', () => {
		const base = calculateSessionBudgetByBlocks({
			blockCount: 1,
			sessionConfig: DEFAULT_TIMER_CONFIG
		});
		expect(sanitizeSessionPlan({ ...base, scheduledStartTimestamp: '1000' })).toBeNull();
		expect(sanitizeSessionPlan({ ...base, targetEndTimestamp: NaN })).toBeNull();
		expect(
			sanitizeSessionPlan({
				...base,
				scheduledStartTimestamp: 5000,
				targetEndTimestamp: 3000
			})
		).toBeNull();
	});

	it('returns null if sessionConfig is invalid', () => {
		const base = calculateSessionBudgetByBlocks({
			blockCount: 1,
			sessionConfig: DEFAULT_TIMER_CONFIG
		});
		expect(sanitizeSessionPlan({ ...base, sessionConfig: null })).toBeNull();
		expect(
			sanitizeSessionPlan({
				...base,
				sessionConfig: { ...DEFAULT_TIMER_CONFIG, focusDurationSeconds: -10 }
			})
		).toBeNull();
		expect(
			sanitizeSessionPlan({
				...base,
				sessionConfig: { ...DEFAULT_TIMER_CONFIG, roundsBeforeLongBreak: 0 }
			})
		).toBeNull();
	});

	it('returns null if blocks is not an array or contains invalid blocks', () => {
		const base = calculateSessionBudgetByBlocks({
			blockCount: 1,
			sessionConfig: DEFAULT_TIMER_CONFIG
		});
		expect(sanitizeSessionPlan({ ...base, blocks: 'not-array' })).toBeNull();
		expect(sanitizeSessionPlan({ ...base, blocks: [{ invalid: true }] })).toBeNull();
	});

	it('returns null if domain alternation or termination invariants are violated', () => {
		const base = calculateSessionBudgetByBlocks({
			blockCount: 1,
			sessionConfig: DEFAULT_TIMER_CONFIG
		});

		// First block is a break
		const breakFirst = {
			...base,
			blocks: [
				{
					index: 0,
					mode: 'shortBreak',
					durationSeconds: 300,
					status: 'pending'
				}
			]
		};
		expect(sanitizeSessionPlan(breakFirst)).toBeNull();

		// Two consecutive focus blocks
		const twoFocus = {
			...base,
			blocks: [
				{
					index: 0,
					mode: 'focus',
					durationSeconds: 1500,
					status: 'pending'
				},
				{
					index: 1,
					mode: 'focus',
					durationSeconds: 1500,
					status: 'pending'
				}
			]
		};
		expect(sanitizeSessionPlan(twoFocus)).toBeNull();
	});
});

describe('LocalStoragePlanRepository', () => {
	let mockStorage: Storage;
	let repository: LocalStoragePlanRepository;

	beforeEach(() => {
		mockStorage = createMockStorage();
		repository = new LocalStoragePlanRepository(mockStorage);
	});

	describe('saveActivePlan and getActivePlan roundtrip', () => {
		it('saves and retrieves a full SessionPlan created by blocks', async () => {
			let plan = calculateSessionBudgetByBlocks({
				blockCount: 2,
				sessionConfig: DEFAULT_TIMER_CONFIG
			});
			plan = assignTaskToBlock(plan, 0, 'task-alpha');
			plan = assignBreakActivityToBlock(plan, 1, 'act-stretch');
			plan = updateBlockStatus(plan, 0, 'completed');

			await repository.saveActivePlan(plan);

			const retrieved = await repository.getActivePlan();
			expect(retrieved).not.toBeNull();
			expect(retrieved).toEqual(plan);
			expect(retrieved?.blocks[0].status).toBe('completed');
			expect(retrieved?.blocks[0].assignedTaskId).toBe('task-alpha');
			expect(retrieved?.blocks[1].assignedBreakActivityId).toBe('act-stretch');
		});

		it('saves and retrieves a full SessionPlan created by end time with timestamps and freeMarginSeconds', async () => {
			const plan = calculateSessionBudgetByEndTime({
				scheduledStartTimestamp: 1700000000000,
				targetEndTimestamp: 1700007200000,
				sessionConfig: DEFAULT_TIMER_CONFIG
			});

			await repository.saveActivePlan(plan);

			const retrieved = await repository.getActivePlan();
			expect(retrieved).not.toBeNull();
			expect(retrieved).toEqual(plan);
			expect(retrieved?.scheduledStartTimestamp).toBe(1700000000000);
			expect(retrieved?.targetEndTimestamp).toBe(1700007200000);
			expect(retrieved?.freeMarginSeconds).toBe(plan.freeMarginSeconds);
		});

		it('works identically via LocalStorageSessionPlanRepository alias', async () => {
			const aliasRepo = new LocalStorageSessionPlanRepository(mockStorage);
			const plan = calculateSessionBudgetByBlocks({
				blockCount: 1,
				sessionConfig: DEFAULT_TIMER_CONFIG
			});

			await aliasRepo.saveActivePlan(plan);
			const retrieved = await aliasRepo.getActivePlan();
			expect(retrieved).toEqual(plan);
		});
	});

	describe('clearActivePlan', () => {
		it('clears active plan from storage and returns null on subsequent getActivePlan', async () => {
			const plan = calculateSessionBudgetByBlocks({
				blockCount: 1,
				sessionConfig: DEFAULT_TIMER_CONFIG
			});

			await repository.saveActivePlan(plan);
			expect(await repository.getActivePlan()).not.toBeNull();

			await repository.clearActivePlan();
			expect(await repository.getActivePlan()).toBeNull();
			expect(mockStorage.getItem(SESSION_PLAN_STORAGE_KEY)).toBeNull();
		});

		it('does not throw when clearing while storage is already empty', async () => {
			await expect(repository.clearActivePlan()).resolves.not.toThrow();
			expect(await repository.getActivePlan()).toBeNull();
		});
	});

	describe('empty and corrupt storage handling', () => {
		it('returns null when storage is completely empty', async () => {
			expect(await repository.getActivePlan()).toBeNull();
		});

		it('returns null when storage item is whitespace or empty string', async () => {
			mockStorage.setItem(SESSION_PLAN_STORAGE_KEY, '');
			expect(await repository.getActivePlan()).toBeNull();

			mockStorage.setItem(SESSION_PLAN_STORAGE_KEY, '   ');
			expect(await repository.getActivePlan()).toBeNull();
		});

		it('returns null when JSON is malformed', async () => {
			mockStorage.setItem(SESSION_PLAN_STORAGE_KEY, '{{corrupt-json');
			expect(await repository.getActivePlan()).toBeNull();
		});

		it('returns null when parsed JSON is not an object', async () => {
			mockStorage.setItem(SESSION_PLAN_STORAGE_KEY, JSON.stringify(12345));
			expect(await repository.getActivePlan()).toBeNull();

			mockStorage.setItem(SESSION_PLAN_STORAGE_KEY, JSON.stringify('string-value'));
			expect(await repository.getActivePlan()).toBeNull();

			mockStorage.setItem(SESSION_PLAN_STORAGE_KEY, JSON.stringify(null));
			expect(await repository.getActivePlan()).toBeNull();
		});

		it('returns null when envelope plan is null or undefined', async () => {
			const envelope: StoredSessionPlanEnvelope = {
				version: SESSION_PLAN_STORAGE_VERSION,
				plan: null
			};
			mockStorage.setItem(SESSION_PLAN_STORAGE_KEY, JSON.stringify(envelope));
			expect(await repository.getActivePlan()).toBeNull();
		});

		it('returns null when plan inside envelope fails schema validation', async () => {
			const corruptEnvelope = {
				version: SESSION_PLAN_STORAGE_VERSION,
				plan: {
					id: 'plan-1',
					targetMode: 'invalid_mode',
					blocks: []
				}
			};
			mockStorage.setItem(SESSION_PLAN_STORAGE_KEY, JSON.stringify(corruptEnvelope));
			expect(await repository.getActivePlan()).toBeNull();
		});
	});

	describe('schema versioning', () => {
		it('returns null when envelope version is unsupported (e.g. version 2 or version 0)', async () => {
			const plan = calculateSessionBudgetByBlocks({
				blockCount: 1,
				sessionConfig: DEFAULT_TIMER_CONFIG
			});

			const v2Envelope = {
				version: 2,
				plan
			};
			mockStorage.setItem(SESSION_PLAN_STORAGE_KEY, JSON.stringify(v2Envelope));
			expect(await repository.getActivePlan()).toBeNull();

			const v0Envelope = {
				version: 0,
				plan
			};
			mockStorage.setItem(SESSION_PLAN_STORAGE_KEY, JSON.stringify(v0Envelope));
			expect(await repository.getActivePlan()).toBeNull();
		});

		it('does not overwrite newer storage envelope versions on saveActivePlan and logs a warning', async () => {
			const consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
			const plan = calculateSessionBudgetByBlocks({
				blockCount: 1,
				sessionConfig: DEFAULT_TIMER_CONFIG
			});

			const futureEnvelope = JSON.stringify({
				version: 99,
				plan
			});
			mockStorage.setItem(SESSION_PLAN_STORAGE_KEY, futureEnvelope);

			const newPlan = calculateSessionBudgetByBlocks({
				blockCount: 3,
				sessionConfig: DEFAULT_TIMER_CONFIG
			});

			await repository.saveActivePlan(newPlan);
			expect(mockStorage.getItem(SESSION_PLAN_STORAGE_KEY)).toBe(futureEnvelope);
			expect(consoleWarnSpy).toHaveBeenCalledWith(
				expect.stringContaining('Storage contains a newer envelope version than supported')
			);

			consoleWarnSpy.mockRestore();
		});

		it('does not clear newer storage envelope versions on clearActivePlan and logs a warning', async () => {
			const consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
			const plan = calculateSessionBudgetByBlocks({
				blockCount: 1,
				sessionConfig: DEFAULT_TIMER_CONFIG
			});

			const futureEnvelope = JSON.stringify({
				version: 99,
				plan
			});
			mockStorage.setItem(SESSION_PLAN_STORAGE_KEY, futureEnvelope);

			await repository.clearActivePlan();
			expect(mockStorage.getItem(SESSION_PLAN_STORAGE_KEY)).toBe(futureEnvelope);
			expect(consoleWarnSpy).toHaveBeenCalledWith(
				expect.stringContaining('Storage contains a newer envelope version than supported')
			);

			consoleWarnSpy.mockRestore();
		});
	});

	describe('defensive fallback when storage is inaccessible (SecurityError / in-memory)', () => {
		it('falls back to in-memory store when initialized without injected storage in Node environment', async () => {
			const ssrRepo = new LocalStoragePlanRepository();
			expect(ssrRepo.getStorage()).toBeInstanceOf(InMemoryStorage);

			const plan = calculateSessionBudgetByBlocks({
				blockCount: 1,
				sessionConfig: DEFAULT_TIMER_CONFIG
			});

			await expect(ssrRepo.saveActivePlan(plan)).resolves.not.toThrow();
			const retrieved = await ssrRepo.getActivePlan();
			expect(retrieved).toEqual(plan);

			await expect(ssrRepo.clearActivePlan()).resolves.not.toThrow();
			expect(await ssrRepo.getActivePlan()).toBeNull();
		});

		it('falls back to InMemoryStorage when window.localStorage throws SecurityError', () => {
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

				const repo = new LocalStoragePlanRepository();
				const storage = repo.getStorage();
				expect(storage).toBeInstanceOf(InMemoryStorage);
			} finally {
				if (originalWindow === undefined) {
					delete (globalThis as unknown as { window?: unknown }).window;
				} else {
					(globalThis as unknown as { window: unknown }).window = originalWindow;
				}
			}
		});

		it('returns window.localStorage when window is present and accessible', () => {
			const originalWindow = globalThis.window;
			try {
				const mockWindowStorage = createMockStorage();
				const mockWindow = { localStorage: mockWindowStorage } as unknown as Window &
					typeof globalThis;
				(globalThis as unknown as { window: unknown }).window = mockWindow;

				const repo = new LocalStoragePlanRepository();
				expect(repo.getStorage()).toBe(mockWindowStorage);
			} finally {
				if (originalWindow === undefined) {
					delete (globalThis as unknown as { window?: unknown }).window;
				} else {
					(globalThis as unknown as { window: unknown }).window = originalWindow;
				}
			}
		});

		it('handles SecurityError on getItem gracefully without throwing', async () => {
			const throwingStorage: Storage = {
				...mockStorage,
				getItem: vi.fn().mockImplementation(() => {
					throw new DOMException('The operation is insecure.', 'SecurityError');
				})
			};

			const repo = new LocalStoragePlanRepository(throwingStorage);
			expect(await repo.getActivePlan()).toBeNull();
		});

		it('handles SecurityError on removeItem gracefully without throwing', async () => {
			const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
			const throwingStorage: Storage = {
				...mockStorage,
				removeItem: vi.fn().mockImplementation(() => {
					throw new DOMException('The operation is insecure.', 'SecurityError');
				})
			};

			const repo = new LocalStoragePlanRepository(throwingStorage);
			await expect(repo.clearActivePlan()).resolves.not.toThrow();
			expect(consoleErrorSpy).toHaveBeenCalledWith(
				'Failed to clear session plan from storage:',
				expect.any(DOMException)
			);
			consoleErrorSpy.mockRestore();
		});
	});

	describe('QuotaExceededError defensive behavior', () => {
		it('handles QuotaExceededError on setItem gracefully without throwing and logs console.error', async () => {
			const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
			const quotaError = new DOMException('The quota has been exceeded.', 'QuotaExceededError');
			const throwingStorage: Storage = {
				...mockStorage,
				setItem: vi.fn().mockImplementation(() => {
					throw quotaError;
				})
			};

			const repo = new LocalStoragePlanRepository(throwingStorage);
			const plan = calculateSessionBudgetByBlocks({
				blockCount: 1,
				sessionConfig: DEFAULT_TIMER_CONFIG
			});

			await expect(repo.saveActivePlan(plan)).resolves.not.toThrow();
			expect(consoleErrorSpy).toHaveBeenCalledWith(
				'Failed to write session plan to storage:',
				quotaError
			);

			consoleErrorSpy.mockRestore();
		});
	});

	describe('validation on saveActivePlan', () => {
		it('throws InvalidSessionPlanError if an invalid plan is passed to saveActivePlan', async () => {
			const invalidPlan = {
				id: '',
				targetMode: 'invalid',
				blocks: [],
				sessionConfig: DEFAULT_TIMER_CONFIG,
				createdAt: 0,
				freeMarginSeconds: -5
			} as unknown as SessionPlan;

			await expect(repository.saveActivePlan(invalidPlan)).rejects.toThrow(InvalidSessionPlanError);
			expect(mockStorage.getItem(SESSION_PLAN_STORAGE_KEY)).toBeNull();
		});
	});
});
