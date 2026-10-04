import { describe, it, expect } from 'vitest';
import { FakeDailyStatsRepository } from '$tests/fakes/repositories/fake-daily-stats-repository';
import {
	type DailyStats,
	type IDailyStatsRepository,
	INITIAL_DAILY_STATS
} from './daily-stats-repository.port';

describe('IDailyStatsRepository port contract', () => {
	it('should return initial stats when freshly initialized', () => {
		const repo: IDailyStatsRepository = new FakeDailyStatsRepository();
		expect(repo.loadStats()).toEqual(INITIAL_DAILY_STATS);
	});

	it('should save and load daily stats accurately', () => {
		const repo: IDailyStatsRepository = new FakeDailyStatsRepository();
		const sampleStats: DailyStats = {
			date: '2026-10-03',
			completedBlocks: 4,
			accumulatedMinutes: 100
		};

		repo.saveStats(sampleStats);
		expect(repo.loadStats()).toEqual(sampleStats);
	});

	it('should reset stats while maintaining repository contract', () => {
		const repo: IDailyStatsRepository = new FakeDailyStatsRepository();
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
