import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
	LocalDailyStatsRepository,
	DAILY_STATS_STORAGE_KEY,
	DAILY_STATS_STORAGE_VERSION,
	getLocalDateString
} from './local-daily-stats-repository';
import type { DailyStats } from '../../domain/ports/daily-stats-repository.port';

class MockStorage implements Storage {
	private store: Map<string, string> = new Map();

	get length(): number {
		return this.store.size;
	}

	public clear(): void {
		this.store.clear();
	}

	public getItem(key: string): string | null {
		return this.store.has(key) ? this.store.get(key)! : null;
	}

	public key(index: number): string | null {
		return Array.from(this.store.keys())[index] ?? null;
	}

	public removeItem(key: string): void {
		this.store.delete(key);
	}

	public setItem(key: string, value: string): void {
		this.store.set(key, value);
	}
}

describe('LocalDailyStatsRepository', () => {
	let storage: MockStorage;
	let fixedNow: Date;

	beforeEach(() => {
		storage = new MockStorage();
		fixedNow = new Date('2026-10-03T14:30:00');
	});

	describe('getLocalDateString', () => {
		it('should format local dates accurately as YYYY-MM-DD', () => {
			const d = new Date(2026, 9, 3); // Oct 3, 2026
			expect(getLocalDateString(d)).toBe('2026-10-03');
		});
	});

	describe('loadStats', () => {
		it('should return initial clean stats for current local date when storage is empty', () => {
			const repo = new LocalDailyStatsRepository(storage, () => fixedNow);
			const stats = repo.loadStats();

			expect(stats).toEqual({
				date: '2026-10-03',
				completedBlocks: 0,
				accumulatedMinutes: 0
			});
		});

		it('should load persisted daily stats when date matches today', () => {
			const repo = new LocalDailyStatsRepository(storage, () => fixedNow);
			const expectedStats: DailyStats = {
				date: '2026-10-03',
				completedBlocks: 4,
				accumulatedMinutes: 100
			};

			repo.saveStats(expectedStats);
			expect(repo.loadStats()).toEqual(expectedStats);
		});

		it('should automatically reset to clean stats when date rolled over (new day)', () => {
			const yesterday = new Date('2026-10-02T22:00:00');
			const repoYesterday = new LocalDailyStatsRepository(storage, () => yesterday);
			repoYesterday.saveStats({
				date: '2026-10-02',
				completedBlocks: 5,
				accumulatedMinutes: 125
			});

			// Now it is tomorrow (fixedNow = 2026-10-03)
			const repoToday = new LocalDailyStatsRepository(storage, () => fixedNow);
			const stats = repoToday.loadStats();

			expect(stats).toEqual({
				date: '2026-10-03',
				completedBlocks: 0,
				accumulatedMinutes: 0
			});
		});

		it('should handle invalid or corrupted JSON gracefully', () => {
			storage.setItem(DAILY_STATS_STORAGE_KEY, 'not-valid-json{{{');
			const repo = new LocalDailyStatsRepository(storage, () => fixedNow);

			expect(repo.loadStats()).toEqual({
				date: '2026-10-03',
				completedBlocks: 0,
				accumulatedMinutes: 0
			});
		});

		it('should handle non-object parsed values gracefully', () => {
			storage.setItem(DAILY_STATS_STORAGE_KEY, JSON.stringify('a primitive string'));
			const repo = new LocalDailyStatsRepository(storage, () => fixedNow);

			expect(repo.loadStats()).toEqual({
				date: '2026-10-03',
				completedBlocks: 0,
				accumulatedMinutes: 0
			});
		});

		it('should sanitize negative or non-integer values', () => {
			storage.setItem(
				DAILY_STATS_STORAGE_KEY,
				JSON.stringify({
					version: DAILY_STATS_STORAGE_VERSION,
					stats: {
						date: '2026-10-03',
						completedBlocks: -2,
						accumulatedMinutes: 'corrupted'
					}
				})
			);
			const repo = new LocalDailyStatsRepository(storage, () => fixedNow);

			expect(repo.loadStats()).toEqual({
				date: '2026-10-03',
				completedBlocks: 0,
				accumulatedMinutes: 0
			});
		});
	});

	describe('saveStats', () => {
		it('should persist envelope under pomody:daily-stats', () => {
			const repo = new LocalDailyStatsRepository(storage, () => fixedNow);
			repo.saveStats({
				date: '2026-10-03',
				completedBlocks: 3,
				accumulatedMinutes: 75
			});

			const raw = storage.getItem(DAILY_STATS_STORAGE_KEY);
			expect(raw).not.toBeNull();
			const parsed = JSON.parse(raw!);
			expect(parsed).toEqual({
				version: DAILY_STATS_STORAGE_VERSION,
				stats: {
					date: '2026-10-03',
					completedBlocks: 3,
					accumulatedMinutes: 75
				}
			});
		});

		it('should defensively sanitize invalid numbers before saving', () => {
			const repo = new LocalDailyStatsRepository(storage, () => fixedNow);
			repo.saveStats({
				date: '2026-10-03',
				completedBlocks: -5,
				accumulatedMinutes: NaN as unknown as number
			});

			expect(repo.loadStats()).toEqual({
				date: '2026-10-03',
				completedBlocks: 0,
				accumulatedMinutes: 0
			});
		});

		it('should not throw if storage.setItem throws an error (e.g. QuotaExceededError)', () => {
			const throwingStorage = new MockStorage();
			vi.spyOn(throwingStorage, 'setItem').mockImplementation(() => {
				throw new Error('QuotaExceededError');
			});
			const repo = new LocalDailyStatsRepository(throwingStorage, () => fixedNow);

			expect(() => {
				repo.saveStats({
					date: '2026-10-03',
					completedBlocks: 1,
					accumulatedMinutes: 25
				});
			}).not.toThrow();
		});
	});

	describe('resetStats', () => {
		it('should overwrite stored stats to zero for the current local date', () => {
			const repo = new LocalDailyStatsRepository(storage, () => fixedNow);
			repo.saveStats({
				date: '2026-10-03',
				completedBlocks: 6,
				accumulatedMinutes: 150
			});

			repo.resetStats();
			expect(repo.loadStats()).toEqual({
				date: '2026-10-03',
				completedBlocks: 0,
				accumulatedMinutes: 0
			});
		});
	});

	describe('SSR and storage-disabled resiliency', () => {
		it('should return clean stats if storage is null or disabled', () => {
			const repo = new LocalDailyStatsRepository(undefined, () => fixedNow);
			// In node/SSR without injected storage or window
			expect(repo.loadStats()).toEqual({
				date: '2026-10-03',
				completedBlocks: 0,
				accumulatedMinutes: 0
			});
		});

		it('should not throw on getItem throwing (SecurityError)', () => {
			const throwingStorage = new MockStorage();
			vi.spyOn(throwingStorage, 'getItem').mockImplementation(() => {
				throw new Error('SecurityError: access denied');
			});
			const repo = new LocalDailyStatsRepository(throwingStorage, () => fixedNow);
			expect(repo.loadStats()).toEqual({
				date: '2026-10-03',
				completedBlocks: 0,
				accumulatedMinutes: 0
			});
		});
	});
});
