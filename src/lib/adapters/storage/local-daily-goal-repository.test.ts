import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
	DAILY_GOAL_STORAGE_KEY,
	DAILY_GOAL_STORAGE_VERSION,
	LocalDailyGoalRepository,
	type StoredDailyGoalEnvelope
} from './local-daily-goal-repository';
import { InMemoryStorage } from './in-memory-storage';
import type { DailyGoalChange } from '../../domain/goals/daily-goal.entity';

const UNRELATED_STORAGE_KEY = 'pomody:settings';

function change(overrides: Partial<DailyGoalChange> = {}): DailyGoalChange {
	return { effectiveFrom: '2026-10-20', minutes: 120, restWeekdays: [6, 7], ...overrides };
}

function storeEnvelope(storage: Storage, envelope: unknown): void {
	storage.setItem(DAILY_GOAL_STORAGE_KEY, JSON.stringify(envelope));
}

function readStoredEnvelope(storage: Storage): StoredDailyGoalEnvelope | null {
	const raw = storage.getItem(DAILY_GOAL_STORAGE_KEY);
	return raw === null ? null : (JSON.parse(raw) as StoredDailyGoalEnvelope);
}

describe('LocalDailyGoalRepository', () => {
	let storage: InMemoryStorage;
	let repository: LocalDailyGoalRepository;

	beforeEach(() => {
		storage = new InMemoryStorage();
		repository = new LocalDailyGoalRepository(storage);
		vi.spyOn(console, 'warn').mockImplementation(() => {});
		vi.spyOn(console, 'error').mockImplementation(() => {});
	});

	afterEach(() => {
		vi.restoreAllMocks();
		vi.unstubAllGlobals();
	});

	it('uses the documented key and version', () => {
		expect(DAILY_GOAL_STORAGE_KEY).toBe('pomody:daily-goal');
		expect(DAILY_GOAL_STORAGE_VERSION).toBe(1);
	});

	describe('getHistory / applyChange', () => {
		it('returns an empty history when nothing is stored', async () => {
			expect(await repository.getHistory()).toEqual([]);
		});

		it('round-trips a change through the versioned envelope', async () => {
			await repository.applyChange(change());

			expect(await repository.getHistory()).toEqual([change()]);
			expect(readStoredEnvelope(storage)).toEqual({ version: 1, changes: [change()] });
		});

		it('keeps earlier changes and sorts them by effective date', async () => {
			const later = change({ effectiveFrom: '2026-10-23', minutes: 90, restWeekdays: [] });
			await repository.applyChange(later);
			await repository.applyChange(change());

			expect(await repository.getHistory()).toEqual([change(), later]);
		});

		it('collapses a second change of the same day into one entry', async () => {
			await repository.applyChange(change());
			const edited = change({ minutes: 45, restWeekdays: [7] });
			await repository.applyChange(edited);

			expect(await repository.getHistory()).toEqual([edited]);
		});

		it('re-reads storage before writing so another tab’s change is not lost', async () => {
			const otherTab = change({ effectiveFrom: '2026-10-10', minutes: 30, restWeekdays: [] });
			await repository.applyChange(change());
			storeEnvelope(storage, {
				version: 1,
				changes: [otherTab, change()]
			});

			const today = change({ effectiveFrom: '2026-10-23', minutes: 60 });
			await repository.applyChange(today);

			expect(await repository.getHistory()).toEqual([otherTab, change(), today]);
		});

		it('does not write an invalid change', async () => {
			await repository.applyChange(change({ minutes: -1 }));

			expect(storage.getItem(DAILY_GOAL_STORAGE_KEY)).toBeNull();
		});

		it('persists a goal removal as zero minutes', async () => {
			await repository.applyChange(change({ effectiveFrom: '2026-10-25', minutes: 0 }));

			expect(readStoredEnvelope(storage)?.changes).toEqual([
				{ effectiveFrom: '2026-10-25', minutes: 0, restWeekdays: [] }
			]);
		});

		it('leaves unrelated storage keys untouched', async () => {
			storage.setItem(UNRELATED_STORAGE_KEY, 'keep');

			await repository.applyChange(change());

			expect(storage.getItem(UNRELATED_STORAGE_KEY)).toBe('keep');
		});
	});

	describe('self-healing', () => {
		it('drops corrupt changes one by one and keeps the valid ones', async () => {
			const valid = change({ effectiveFrom: '2026-10-21' });
			storeEnvelope(storage, {
				version: 1,
				changes: [
					null,
					'oops',
					change({ minutes: 0.5 }),
					change({ effectiveFrom: '2026-02-30' }),
					change({ restWeekdays: [1, 1] }),
					valid,
					{ effectiveFrom: '2026-10-22' }
				]
			});

			expect(await repository.getHistory()).toEqual([valid]);
		});

		it('sorts an unsorted stored list and lets the later duplicate of a day win', async () => {
			const early = change({ effectiveFrom: '2026-10-10', minutes: 30 });
			const first = change({ minutes: 60 });
			const second = change({ minutes: 90 });
			storeEnvelope(storage, { version: 1, changes: [second, early, first, second] });

			expect(await repository.getHistory()).toEqual([early, second]);
		});

		it('normalizes the order of stored rest weekdays', async () => {
			storeEnvelope(storage, { version: 1, changes: [change({ restWeekdays: [7, 2] })] });

			expect((await repository.getHistory())[0].restWeekdays).toEqual([2, 7]);
		});

		it.each([
			['garbage JSON', '{not json'],
			['an empty string', ''],
			['a JSON string', '"hello"'],
			['null', 'null'],
			['a bare array', '[1,2,3]'],
			['an envelope without changes', '{"version":1}'],
			['an envelope whose changes is not a list', '{"version":1,"changes":{}}']
		])('reads %s as an empty history', async (_label, raw) => {
			storage.setItem(DAILY_GOAL_STORAGE_KEY, raw);

			expect(await repository.getHistory()).toEqual([]);
		});

		it('rebuilds a garbage payload on the next write', async () => {
			storage.setItem(DAILY_GOAL_STORAGE_KEY, '{not json');

			await repository.applyChange(change());

			expect(await repository.getHistory()).toEqual([change()]);
		});
	});

	describe('newer stored version', () => {
		it('reads it as empty and aborts the write leaving the bytes identical', async () => {
			const futureBytes = JSON.stringify({ version: 2, changes: [change()], extra: 'x' });
			storage.setItem(DAILY_GOAL_STORAGE_KEY, futureBytes);

			expect(await repository.getHistory()).toEqual([]);
			await repository.applyChange(change({ effectiveFrom: '2026-10-23' }));

			expect(storage.getItem(DAILY_GOAL_STORAGE_KEY)).toBe(futureBytes);
			expect(console.warn).toHaveBeenCalledTimes(1);
		});
	});

	describe('resilience', () => {
		it('swallows a failing getItem when reading', async () => {
			vi.spyOn(storage, 'getItem').mockImplementation(() => {
				throw new Error('SecurityError');
			});

			expect(await repository.getHistory()).toEqual([]);
		});

		it('swallows a failing setItem when writing', async () => {
			vi.spyOn(storage, 'setItem').mockImplementation(() => {
				throw new Error('QuotaExceededError');
			});

			await expect(repository.applyChange(change())).resolves.toBeUndefined();
			expect(console.error).toHaveBeenCalled();
		});

		it('works without a window: falls back to an in-memory store', async () => {
			vi.stubGlobal('window', undefined);
			const ssrRepository = new LocalDailyGoalRepository();

			await ssrRepository.applyChange(change());

			expect(await ssrRepository.getHistory()).toEqual([change()]);
		});

		it('uses window.localStorage when no storage is injected', async () => {
			const windowStorage = new InMemoryStorage();
			vi.stubGlobal('window', { localStorage: windowStorage });
			const browserRepository = new LocalDailyGoalRepository();

			await browserRepository.applyChange(change());

			expect(readStoredEnvelope(windowStorage)?.changes).toEqual([change()]);
		});

		it('falls back to memory when window.localStorage throws', async () => {
			vi.stubGlobal('window', {
				get localStorage(): Storage {
					throw new Error('SecurityError');
				}
			});
			const blockedRepository = new LocalDailyGoalRepository();

			await blockedRepository.applyChange(change());

			expect(await blockedRepository.getHistory()).toEqual([change()]);
		});
	});

	describe('onExternalChange', () => {
		function stubWindow() {
			const listeners = new Map<string, (event: Event) => void>();
			vi.stubGlobal('window', {
				addEventListener: (type: string, handler: (event: Event) => void) =>
					listeners.set(type, handler),
				removeEventListener: (type: string) => listeners.delete(type)
			});
			return listeners;
		}

		function storageEvent(key: string | null): Event {
			return { key } as unknown as Event;
		}

		it('notifies on a change of its own key and when the whole storage was cleared', () => {
			const listeners = stubWindow();
			const listener = vi.fn();
			repository.onExternalChange(listener);

			listeners.get('storage')?.(storageEvent(DAILY_GOAL_STORAGE_KEY));
			listeners.get('storage')?.(storageEvent(null));

			expect(listener).toHaveBeenCalledTimes(2);
		});

		it('ignores other keys', () => {
			const listeners = stubWindow();
			const listener = vi.fn();
			repository.onExternalChange(listener);

			listeners.get('storage')?.(storageEvent(UNRELATED_STORAGE_KEY));

			expect(listener).not.toHaveBeenCalled();
		});

		it('stops notifying after unsubscribe', () => {
			const listeners = stubWindow();
			const unsubscribe = repository.onExternalChange(vi.fn());

			unsubscribe();

			expect(listeners.has('storage')).toBe(false);
		});

		it('is a no-op without a window', () => {
			vi.stubGlobal('window', undefined);

			expect(() => repository.onExternalChange(vi.fn())()).not.toThrow();
		});
	});
});
