import { describe, it, expect } from 'vitest';
import {
	type DailyStats,
	type IDailyStatsRepository,
	INITIAL_DAILY_STATS
} from './daily-stats-repository.port';

describe('IDailyStatsRepository port contract', () => {
	class InMemoryDailyStatsRepository implements IDailyStatsRepository {
		private stats: DailyStats = { ...INITIAL_DAILY_STATS };

		public loadStats(): DailyStats {
			return this.stats;
		}

		public saveStats(stats: DailyStats): void {
			this.stats = stats;
		}

		public resetStats(): void {
			this.stats = {
				date: this.stats.date,
				completedBlocks: 0,
				accumulatedMinutes: 0
			};
		}
	}

	it('should return initial stats when freshly initialized', () => {
		const repo: IDailyStatsRepository = new InMemoryDailyStatsRepository();
		expect(repo.loadStats()).toEqual(INITIAL_DAILY_STATS);
	});

	it('should save and load daily stats accurately', () => {
		const repo: IDailyStatsRepository = new InMemoryDailyStatsRepository();
		const sampleStats: DailyStats = {
			date: '2026-10-03',
			completedBlocks: 4,
			accumulatedMinutes: 100
		};

		repo.saveStats(sampleStats);
		expect(repo.loadStats()).toEqual(sampleStats);
	});

	it('should reset stats while maintaining repository contract', () => {
		const repo: IDailyStatsRepository = new InMemoryDailyStatsRepository();
		repo.saveStats({
			date: '2026-10-03',
			completedBlocks: 3,
			accumulatedMinutes: 75
		});

		repo.resetStats();
		expect(repo.loadStats()).toEqual({
			date: '2026-10-03',
			completedBlocks: 0,
			accumulatedMinutes: 0
		});
	});
});
