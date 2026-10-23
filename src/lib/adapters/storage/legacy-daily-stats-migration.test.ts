import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
	LEGACY_DAILY_STATS_STORAGE_KEY,
	migrateLegacyDailyStats
} from './legacy-daily-stats-migration';
import {
	FOCUS_HISTORY_STORAGE_KEY,
	LocalFocusHistoryRepository
} from './local-focus-history-repository';
import { InMemoryStorage } from './in-memory-storage';
import {
	localDateKey,
	type FocusHistoryEntry
} from '../../domain/history/focus-history-entry.entity';

const NOW = new Date(2026, 9, 23, 14, 5, 0);
const TODAY = '2026-10-23';

function legacyRecord(completedBlocks: number, accumulatedMinutes: number, date = TODAY): string {
	return JSON.stringify({ version: 1, stats: { date, completedBlocks, accumulatedMinutes } });
}

function oldCounterMinutes(entries: readonly FocusHistoryEntry[]): number {
	return entries.reduce((sum, entry) => sum + Math.round(entry.plannedMs / 60000), 0);
}

describe('migrateLegacyDailyStats', () => {
	let storage: InMemoryStorage;
	let repository: LocalFocusHistoryRepository;

	const run = () => migrateLegacyDailyStats({ storage, repository, now: () => NOW });

	beforeEach(() => {
		storage = new InMemoryStorage();
		repository = new LocalFocusHistoryRepository(storage, () => NOW);
	});

	it('does nothing when the legacy key is absent', async () => {
		const setItem = vi.spyOn(storage, 'setItem');
		const removeItem = vi.spyOn(storage, 'removeItem');

		await run();

		expect(setItem).not.toHaveBeenCalled();
		expect(removeItem).not.toHaveBeenCalled();
		expect(storage.length).toBe(0);
	});

	it('turns today’s record into migrated entries and removes the legacy key', async () => {
		storage.setItem(LEGACY_DAILY_STATS_STORAGE_KEY, legacyRecord(4, 100));

		await run();

		const entries = await repository.getAll();
		expect(entries).toHaveLength(4);
		expect(oldCounterMinutes(entries)).toBe(100);
		for (const entry of entries) {
			expect(entry).toMatchObject({
				mode: 'focus',
				outcome: 'completed',
				migrated: true,
				endedAt: NOW.getTime(),
				utcOffsetMinutes: 0 - NOW.getTimezoneOffset()
			});
			expect(entry.plannedMs).toBe(entry.elapsedMs);
			expect(localDateKey(entry)).toBe(TODAY);
		}
		expect(storage.getItem(LEGACY_DAILY_STATS_STORAGE_KEY)).toBeNull();
	});

	it('keeps the entries that were already in the history', async () => {
		const earlier: FocusHistoryEntry = {
			mode: 'focus',
			outcome: 'completed',
			plannedMs: 1_500_000,
			elapsedMs: 1_500_000,
			endedAt: NOW.getTime() - 3_600_000,
			utcOffsetMinutes: 0 - NOW.getTimezoneOffset()
		};
		await repository.append(earlier);
		storage.setItem(LEGACY_DAILY_STATS_STORAGE_KEY, legacyRecord(1, 25));

		await run();

		const entries = await repository.getAll();
		expect(entries).toHaveLength(2);
		expect(entries[0]).toEqual(earlier);
	});

	it('is idempotent: a second run finds no key and writes nothing', async () => {
		storage.setItem(LEGACY_DAILY_STATS_STORAGE_KEY, legacyRecord(3, 50));
		await run();
		const afterFirst = storage.getItem(FOCUS_HISTORY_STORAGE_KEY);
		const setItem = vi.spyOn(storage, 'setItem');

		await run();

		expect(setItem).not.toHaveBeenCalled();
		expect(storage.getItem(FOCUS_HISTORY_STORAGE_KEY)).toBe(afterFirst);
		expect(await repository.getAll()).toHaveLength(3);
	});

	it('does not duplicate entries when a crash left the legacy key behind', async () => {
		storage.setItem(LEGACY_DAILY_STATS_STORAGE_KEY, legacyRecord(4, 100));
		await run();
		// The key survived although the entries were persisted (removal failed or the tab died).
		storage.setItem(LEGACY_DAILY_STATS_STORAGE_KEY, legacyRecord(4, 100));

		await run();

		const entries = await repository.getAll();
		expect(entries).toHaveLength(4);
		expect(oldCounterMinutes(entries)).toBe(100);
		expect(storage.getItem(LEGACY_DAILY_STATS_STORAGE_KEY)).toBeNull();
	});

	it('completes a partially persisted migration instead of repeating it', async () => {
		storage.setItem(LEGACY_DAILY_STATS_STORAGE_KEY, legacyRecord(3, 50));
		await run();
		const [first, ...rest] = await repository.getAll();
		expect(rest).toHaveLength(2);
		// Simulate a crash after the first append: only one migrated entry is stored.
		storage.setItem(FOCUS_HISTORY_STORAGE_KEY, JSON.stringify({ version: 1, entries: [first] }));
		storage.setItem(LEGACY_DAILY_STATS_STORAGE_KEY, legacyRecord(3, 50));

		await run();

		const entries = await repository.getAll();
		expect(entries).toHaveLength(3);
		expect(oldCounterMinutes(entries)).toBe(50);
		expect(storage.getItem(LEGACY_DAILY_STATS_STORAGE_KEY)).toBeNull();
	});

	it('only removes the key of a record from another day', async () => {
		storage.setItem(LEGACY_DAILY_STATS_STORAGE_KEY, legacyRecord(4, 100, '2026-10-22'));

		await run();

		expect(storage.getItem(LEGACY_DAILY_STATS_STORAGE_KEY)).toBeNull();
		expect(storage.getItem(FOCUS_HISTORY_STORAGE_KEY)).toBeNull();
		expect(await repository.getAll()).toEqual([]);
	});

	it('only removes the key of a record with zero blocks', async () => {
		storage.setItem(LEGACY_DAILY_STATS_STORAGE_KEY, legacyRecord(0, 0));

		await run();

		expect(storage.getItem(LEGACY_DAILY_STATS_STORAGE_KEY)).toBeNull();
		expect(storage.getItem(FOCUS_HISTORY_STORAGE_KEY)).toBeNull();
	});

	it.each(['not json', '{', '', 'null', '[]', '"text"', '42', '{"version":1}'])(
		'only removes the key when its content is garbage (%j)',
		async (garbage) => {
			storage.setItem(LEGACY_DAILY_STATS_STORAGE_KEY, garbage);

			await run();

			expect(storage.getItem(LEGACY_DAILY_STATS_STORAGE_KEY)).toBeNull();
			expect(storage.getItem(FOCUS_HISTORY_STORAGE_KEY)).toBeNull();
		}
	);

	it('keeps the legacy key and leaves a newer history untouched', async () => {
		const newer = JSON.stringify({ version: 2, entries: [{ future: 'format' }] });
		storage.setItem(FOCUS_HISTORY_STORAGE_KEY, newer);
		storage.setItem(LEGACY_DAILY_STATS_STORAGE_KEY, legacyRecord(4, 100));
		vi.spyOn(console, 'warn').mockImplementation(() => {});

		await run();

		expect(storage.getItem(FOCUS_HISTORY_STORAGE_KEY)).toBe(newer);
		expect(storage.getItem(LEGACY_DAILY_STATS_STORAGE_KEY)).toBe(legacyRecord(4, 100));
	});

	it('keeps the legacy key when the history write fails', async () => {
		storage.setItem(LEGACY_DAILY_STATS_STORAGE_KEY, legacyRecord(2, 50));
		const realSetItem = storage.setItem.bind(storage);
		vi.spyOn(storage, 'setItem').mockImplementation((key, value) => {
			if (key === FOCUS_HISTORY_STORAGE_KEY) {
				throw new DOMException('full', 'QuotaExceededError');
			}
			realSetItem(key, value);
		});
		vi.spyOn(console, 'error').mockImplementation(() => {});

		await run();

		expect(storage.getItem(LEGACY_DAILY_STATS_STORAGE_KEY)).toBe(legacyRecord(2, 50));
	});

	it('never throws when storage reads fail', async () => {
		vi.spyOn(storage, 'getItem').mockImplementation(() => {
			throw new DOMException('denied', 'SecurityError');
		});

		await expect(run()).resolves.toBeUndefined();
	});

	it('never throws when removing the key fails, and a later run finishes the job', async () => {
		storage.setItem(LEGACY_DAILY_STATS_STORAGE_KEY, legacyRecord(2, 50));
		const removeItem = vi.spyOn(storage, 'removeItem').mockImplementationOnce(() => {
			throw new DOMException('denied', 'SecurityError');
		});

		await expect(run()).resolves.toBeUndefined();
		expect(storage.getItem(LEGACY_DAILY_STATS_STORAGE_KEY)).not.toBeNull();

		await run();

		expect(removeItem).toHaveBeenCalledTimes(2);
		expect(storage.getItem(LEGACY_DAILY_STATS_STORAGE_KEY)).toBeNull();
		expect(await repository.getAll()).toHaveLength(2);
	});

	it('does not touch any other key', async () => {
		storage.setItem('pomody:tasks', '{"keep":"me"}');
		storage.setItem(LEGACY_DAILY_STATS_STORAGE_KEY, legacyRecord(1, 25));

		await run();

		expect(storage.getItem('pomody:tasks')).toBe('{"keep":"me"}');
	});
});
