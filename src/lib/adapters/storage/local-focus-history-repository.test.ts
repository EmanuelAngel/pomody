import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
	FOCUS_HISTORY_STORAGE_KEY,
	FOCUS_HISTORY_STORAGE_VERSION,
	LocalFocusHistoryRepository,
	type StoredFocusHistoryEnvelope
} from './local-focus-history-repository';
import { InMemoryStorage } from './in-memory-storage';
import type { FocusHistoryEntry } from '../../domain/history/focus-history-entry.entity';

const UNRELATED_STORAGE_KEY = 'pomody:settings';
const DAY_MS = 24 * 60 * 60 * 1000;
const NOW = new Date('2026-10-23T14:05:00.000Z');

function entry(overrides: Partial<FocusHistoryEntry> = {}): FocusHistoryEntry {
	return {
		mode: 'focus',
		outcome: 'completed',
		plannedMs: 1_500_000,
		elapsedMs: 1_500_000,
		endedAt: NOW.getTime() - 1000,
		utcOffsetMinutes: -180,
		...overrides
	};
}

function storeEnvelope(storage: Storage, envelope: unknown): void {
	storage.setItem(FOCUS_HISTORY_STORAGE_KEY, JSON.stringify(envelope));
}

function readStoredEnvelope(storage: Storage): StoredFocusHistoryEnvelope | null {
	const raw = storage.getItem(FOCUS_HISTORY_STORAGE_KEY);
	return raw === null ? null : (JSON.parse(raw) as StoredFocusHistoryEnvelope);
}

describe('LocalFocusHistoryRepository', () => {
	let storage: InMemoryStorage;
	let repository: LocalFocusHistoryRepository;

	beforeEach(() => {
		storage = new InMemoryStorage();
		repository = new LocalFocusHistoryRepository(storage, () => NOW);
		vi.spyOn(console, 'warn').mockImplementation(() => {});
		vi.spyOn(console, 'error').mockImplementation(() => {});
	});

	afterEach(() => {
		vi.restoreAllMocks();
		vi.unstubAllGlobals();
	});

	it('uses the documented key and version', () => {
		expect(FOCUS_HISTORY_STORAGE_KEY).toBe('pomody:focus-history');
		expect(FOCUS_HISTORY_STORAGE_VERSION).toBe(1);
	});

	describe('getAll / append', () => {
		it('returns an empty list when nothing is stored', async () => {
			expect(await repository.getAll()).toEqual([]);
		});

		it('round-trips entries through a versioned envelope, optional fields included', async () => {
			const withTask = entry({ taskId: 't_3', taskTitle: 'Write report' });
			const migrated = entry({ endedAt: NOW.getTime() - 2000, migrated: true });

			await repository.append(withTask);
			await repository.append(migrated);

			expect(readStoredEnvelope(storage)?.version).toBe(1);
			expect(await repository.getAll()).toEqual([migrated, withTask]);
		});

		it('returns entries in chronological order regardless of append order', async () => {
			const first = entry({ endedAt: NOW.getTime() - 3000 });
			const second = entry({ endedAt: NOW.getTime() - 2000 });
			const third = entry({ endedAt: NOW.getTime() - 1000 });

			await repository.append(third);
			await repository.append(first);
			await repository.append(second);

			expect(await repository.getAll()).toEqual([first, second, third]);
		});

		it('does not persist an invalid entry', async () => {
			await repository.append({ ...entry(), mode: 'nap' } as unknown as FocusHistoryEntry);

			expect(storage.getItem(FOCUS_HISTORY_STORAGE_KEY)).toBeNull();
		});

		it('does not touch unrelated keys', async () => {
			storage.setItem(UNRELATED_STORAGE_KEY, 'keep');

			await repository.append(entry());

			expect(storage.getItem(UNRELATED_STORAGE_KEY)).toBe('keep');
		});
	});

	describe('self-healing', () => {
		it('drops invalid entries one by one and keeps the valid ones', async () => {
			const good = entry({ endedAt: NOW.getTime() - 5000 });
			const alsoGood = entry({ endedAt: NOW.getTime() - 4000 });
			storeEnvelope(storage, {
				version: 1,
				entries: [
					good,
					{ ...entry(), outcome: 'failed' },
					null,
					'junk',
					{ ...entry(), plannedMs: 10, elapsedMs: 20 },
					alsoGood
				]
			});

			expect(await repository.getAll()).toEqual([good, alsoGood]);
		});

		it('does not rewrite the payload on read', async () => {
			const payload = JSON.stringify({ version: 1, entries: [entry(), { broken: true }] });
			storage.setItem(FOCUS_HISTORY_STORAGE_KEY, payload);

			await repository.getAll();

			expect(storage.getItem(FOCUS_HISTORY_STORAGE_KEY)).toBe(payload);
		});

		it('persists only the valid entries on the next append', async () => {
			const good = entry({ endedAt: NOW.getTime() - 5000 });
			storeEnvelope(storage, { version: 1, entries: [good, { broken: true }] });
			const added = entry({ endedAt: NOW.getTime() - 1000 });

			await repository.append(added);

			expect(readStoredEnvelope(storage)?.entries).toEqual([good, added]);
		});

		it('treats unparseable JSON as empty on read without overwriting it', async () => {
			storage.setItem(FOCUS_HISTORY_STORAGE_KEY, '{not json');

			expect(await repository.getAll()).toEqual([]);
			expect(storage.getItem(FOCUS_HISTORY_STORAGE_KEY)).toBe('{not json');
		});

		it('treats a non-envelope payload as empty', async () => {
			for (const payload of ['null', '42', '[]', '{"version":1}', '{"version":1,"entries":"x"}']) {
				storage.setItem(FOCUS_HISTORY_STORAGE_KEY, payload);
				expect(await repository.getAll()).toEqual([]);
			}
		});

		it('starts a fresh envelope when appending over unparseable JSON', async () => {
			storage.setItem(FOCUS_HISTORY_STORAGE_KEY, '{not json');
			const added = entry();

			await repository.append(added);

			expect(await repository.getAll()).toEqual([added]);
		});
	});

	describe('newer stored version', () => {
		const newerPayload = JSON.stringify({
			version: 2,
			entries: [{ shape: 'from the future' }],
			extra: true
		});

		it('reads as empty because it cannot understand the entries', async () => {
			storage.setItem(FOCUS_HISTORY_STORAGE_KEY, newerPayload);

			expect(await repository.getAll()).toEqual([]);
		});

		it('aborts append and leaves the stored payload byte-identical', async () => {
			storage.setItem(FOCUS_HISTORY_STORAGE_KEY, newerPayload);
			const setItem = vi.spyOn(storage, 'setItem');

			await repository.append(entry());

			expect(setItem).not.toHaveBeenCalled();
			expect(storage.getItem(FOCUS_HISTORY_STORAGE_KEY)).toBe(newerPayload);
			expect(console.warn).toHaveBeenCalled();
		});
	});

	describe('retention', () => {
		it('trims entries older than 365 days on append, keeping the boundary', async () => {
			const tooOld = entry({ endedAt: NOW.getTime() - 365 * DAY_MS - 1 });
			const boundary = entry({ endedAt: NOW.getTime() - 365 * DAY_MS });
			storeEnvelope(storage, { version: 1, entries: [tooOld, boundary] });
			const added = entry();

			await repository.append(added);

			expect(readStoredEnvelope(storage)?.entries).toEqual([boundary, added]);
		});

		it('uses the injected clock, not the real one', async () => {
			const future = new LocalFocusHistoryRepository(
				storage,
				() => new Date(NOW.getTime() + 400 * DAY_MS)
			);
			await repository.append(entry());

			await future.append(entry({ endedAt: NOW.getTime() + 399 * DAY_MS }));

			expect(await future.getAll()).toEqual([entry({ endedAt: NOW.getTime() + 399 * DAY_MS })]);
		});
	});

	describe('concurrency between instances', () => {
		it('re-reads storage before writing so two writers both keep their entries', async () => {
			const otherTab = new LocalFocusHistoryRepository(storage, () => NOW);
			const mine = entry({ endedAt: NOW.getTime() - 2000 });
			const theirs = entry({ endedAt: NOW.getTime() - 1000, mode: 'shortBreak' });

			// Both repositories were created before either wrote; neither may hold a stale copy.
			await repository.getAll();
			await otherTab.getAll();
			await repository.append(mine);
			await otherTab.append(theirs);

			expect(await repository.getAll()).toEqual([mine, theirs]);
			expect(await otherTab.getAll()).toEqual([mine, theirs]);
		});
	});

	describe('quota handling', () => {
		function seed(count: number): FocusHistoryEntry[] {
			return Array.from({ length: count }, (_, index) =>
				entry({ endedAt: NOW.getTime() - (count - index + 1) * 1000 })
			);
		}

		it('trims the oldest 10% and retries once when setItem throws on quota', async () => {
			const seeded = seed(20);
			storeEnvelope(storage, { version: 1, entries: seeded });
			const added = entry();
			const original = storage.setItem.bind(storage);
			const setItem = vi.spyOn(storage, 'setItem').mockImplementationOnce(() => {
				throw new DOMException('full', 'QuotaExceededError');
			});
			setItem.mockImplementation(original);

			await repository.append(added);

			expect(setItem).toHaveBeenCalledTimes(2);
			// 21 entries, oldest 10% = ceil(2.1) = 3 dropped.
			const stored = readStoredEnvelope(storage)?.entries;
			expect(stored).toHaveLength(18);
			expect(stored).toEqual([...seeded.slice(3), added]);
		});

		it('drops at least one entry when 10% rounds to zero', async () => {
			const seeded = seed(3);
			storeEnvelope(storage, { version: 1, entries: seeded });
			const added = entry();
			const original = storage.setItem.bind(storage);
			vi.spyOn(storage, 'setItem')
				.mockImplementationOnce(() => {
					throw new DOMException('full', 'QuotaExceededError');
				})
				.mockImplementation(original);

			await repository.append(added);

			expect(readStoredEnvelope(storage)?.entries).toEqual([...seeded.slice(1), added]);
		});

		it('gives up silently after a second failure and leaves storage unchanged', async () => {
			const seeded = seed(10);
			storeEnvelope(storage, { version: 1, entries: seeded });
			const before = storage.getItem(FOCUS_HISTORY_STORAGE_KEY);
			const setItem = vi.spyOn(storage, 'setItem').mockImplementation(() => {
				throw new DOMException('full', 'QuotaExceededError');
			});

			await expect(repository.append(entry())).resolves.toBeUndefined();

			expect(setItem).toHaveBeenCalledTimes(2);
			expect(storage.getItem(FOCUS_HISTORY_STORAGE_KEY)).toBe(before);
		});

		it('does not retry forever when there is nothing left to trim', async () => {
			const setItem = vi.spyOn(storage, 'setItem').mockImplementation(() => {
				throw new DOMException('full', 'QuotaExceededError');
			});

			await expect(repository.append(entry())).resolves.toBeUndefined();

			expect(setItem.mock.calls.length).toBeLessThanOrEqual(2);
			expect(storage.getItem(FOCUS_HISTORY_STORAGE_KEY)).toBeNull();
		});
	});

	describe('clearAll', () => {
		it('removes only the history key', async () => {
			storage.setItem(UNRELATED_STORAGE_KEY, 'keep');
			await repository.append(entry());

			await repository.clearAll();

			expect(storage.getItem(FOCUS_HISTORY_STORAGE_KEY)).toBeNull();
			expect(storage.getItem(UNRELATED_STORAGE_KEY)).toBe('keep');
			expect(await repository.getAll()).toEqual([]);
		});

		it('swallows storage errors', async () => {
			vi.spyOn(storage, 'removeItem').mockImplementation(() => {
				throw new DOMException('denied', 'SecurityError');
			});

			await expect(repository.clearAll()).resolves.toBeUndefined();
		});
	});

	describe('storage failures', () => {
		it('returns empty when getItem throws', async () => {
			vi.spyOn(storage, 'getItem').mockImplementation(() => {
				throw new DOMException('denied', 'SecurityError');
			});

			expect(await repository.getAll()).toEqual([]);
		});

		it('falls back to in-memory storage when none is injected and window is unavailable', async () => {
			const fallback = new LocalFocusHistoryRepository(undefined, () => NOW);
			const added = entry();

			await fallback.append(added);

			expect(await fallback.getAll()).toEqual([added]);
		});
	});

	describe('onExternalChange', () => {
		function stubWindow(): EventTarget {
			const target = new EventTarget();
			vi.stubGlobal('window', target);
			return target;
		}

		function dispatchStorageEvent(target: EventTarget, key: string | null): void {
			target.dispatchEvent(Object.assign(new Event('storage'), { key }));
		}

		it('fires for storage events on this key only', () => {
			const target = stubWindow();
			const listener = vi.fn();
			repository.onExternalChange(listener);

			dispatchStorageEvent(target, UNRELATED_STORAGE_KEY);
			expect(listener).not.toHaveBeenCalled();

			dispatchStorageEvent(target, FOCUS_HISTORY_STORAGE_KEY);
			expect(listener).toHaveBeenCalledTimes(1);
		});

		it('fires when another tab clears the whole storage (null key)', () => {
			const target = stubWindow();
			const listener = vi.fn();
			repository.onExternalChange(listener);

			dispatchStorageEvent(target, null);

			expect(listener).toHaveBeenCalledTimes(1);
		});

		it('stops notifying after unsubscribe', () => {
			const target = stubWindow();
			const listener = vi.fn();
			const unsubscribe = repository.onExternalChange(listener);

			unsubscribe();
			dispatchStorageEvent(target, FOCUS_HISTORY_STORAGE_KEY);

			expect(listener).not.toHaveBeenCalled();
		});

		it('is a no-op without a window (SSR) and still returns an unsubscribe', () => {
			const unsubscribe = repository.onExternalChange(vi.fn());

			expect(() => unsubscribe()).not.toThrow();
		});
	});
});
