import { describe, it, expect, vi } from 'vitest';
import {
	ACTIVITY_LOG_STORAGE_KEY,
	ACTIVITY_LOG_STORAGE_VERSION,
	LocalActivityLogRepository
} from './local-activity-log-repository';
import { InMemoryStorage } from './in-memory-storage';
import type { ActivityLogEntry } from '../../domain/activity/activity-log-entry.entity';

const DAY_MS = 24 * 60 * 60 * 1000;
const NOW = new Date('2026-11-20T15:00:00.000Z');

function entry(overrides: Partial<ActivityLogEntry> = {}): ActivityLogEntry {
	return { kind: 'block-started', at: NOW.getTime(), utcOffsetMinutes: -180, ...overrides };
}

describe('LocalActivityLogRepository', () => {
	it('appends into a versioned envelope under its own key', async () => {
		const storage = new InMemoryStorage();
		const repository = new LocalActivityLogRepository(storage, () => NOW);

		await repository.append(entry({ mode: 'focus' }));

		expect(JSON.parse(storage.getItem(ACTIVITY_LOG_STORAGE_KEY)!)).toEqual({
			version: ACTIVITY_LOG_STORAGE_VERSION,
			entries: [entry({ mode: 'focus' })]
		});
		expect(storage.getItem('pomody:focus-history')).toBeNull();
	});

	it('prunes entries beyond 30 days on write and returns them chronologically', async () => {
		const storage = new InMemoryStorage();
		const expired = entry({ at: NOW.getTime() - 31 * DAY_MS });
		const older = entry({ at: NOW.getTime() - DAY_MS, kind: 'session-started' });
		storage.setItem(
			ACTIVITY_LOG_STORAGE_KEY,
			JSON.stringify({ version: 1, entries: [older, expired, { kind: 'bogus' }] })
		);
		const repository = new LocalActivityLogRepository(storage, () => NOW);

		await repository.append(entry());

		expect(await repository.getAll()).toEqual([older, entry()]);
	});

	it('never overwrites an envelope written by a newer version', async () => {
		const storage = new InMemoryStorage();
		const future = JSON.stringify({ version: 99, entries: [] });
		storage.setItem(ACTIVITY_LOG_STORAGE_KEY, future);

		await new LocalActivityLogRepository(storage, () => NOW).append(entry());

		expect(storage.getItem(ACTIVITY_LOG_STORAGE_KEY)).toBe(future);
	});

	it('swallows a failing write', async () => {
		const storage = new InMemoryStorage();
		vi.spyOn(storage, 'setItem').mockImplementation(() => {
			throw new Error('QuotaExceededError');
		});
		const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

		await expect(
			new LocalActivityLogRepository(storage, () => NOW).append(entry())
		).resolves.toBeUndefined();
		consoleSpy.mockRestore();
	});
});
