import { describe, it, expect } from 'vitest';
import { FakeDailyStatsRepository } from '$tests/fakes/repositories/fake-daily-stats-repository';
import { INITIAL_DAILY_STATS } from '$lib/domain/ports/daily-stats-repository.port';

describe('FakeDailyStatsRepository', () => {
	it('initializes with INITIAL_DAILY_STATS by default', () => {
		const repo = new FakeDailyStatsRepository();
		expect(repo.loadStats()).toEqual(INITIAL_DAILY_STATS);
	});

	it('initializes with partial stats merged with defaults', () => {
		const repo = new FakeDailyStatsRepository({
			date: '2026-10-03',
			completedBlocks: 5
		});

		expect(repo.loadStats()).toEqual({
			date: '2026-10-03',
			completedBlocks: 5,
			accumulatedMinutes: 0
		});
	});

	it('saves stats and records calls', () => {
		const repo = new FakeDailyStatsRepository();
		const newStats = {
			date: '2026-10-03',
			completedBlocks: 3,
			accumulatedMinutes: 75
		};

		repo.saveStats(newStats);

		expect(repo.loadStats()).toEqual(newStats);
		expect(repo.saveStatsCalls).toHaveLength(1);
		expect(repo.saveStatsCalls[0]).toEqual(newStats);
	});

	it('resets focus stats to 0 while preserving the date', () => {
		const repo = new FakeDailyStatsRepository({
			date: '2026-10-03',
			completedBlocks: 8,
			accumulatedMinutes: 200
		});

		repo.resetStats();

		expect(repo.resetStatsCalls).toBe(1);
		expect(repo.loadStats()).toEqual({
			date: '2026-10-03',
			completedBlocks: 0,
			accumulatedMinutes: 0
		});
	});
});
