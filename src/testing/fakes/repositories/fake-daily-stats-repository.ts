import {
	INITIAL_DAILY_STATS,
	type DailyStats,
	type IDailyStatsRepository
} from '$lib/domain/ports/daily-stats-repository.port';

/**
 * In-memory test fake implementing IDailyStatsRepository.
 * Synchronous stateful persistence for daily focus statistics with call tracking for assertions.
 */
export class FakeDailyStatsRepository implements IDailyStatsRepository {
	public stats: DailyStats;
	public saveStatsCalls: DailyStats[] = [];
	public resetStatsCalls = 0;

	constructor(initialStats: DailyStats | Partial<DailyStats> = INITIAL_DAILY_STATS) {
		this.stats = {
			date: initialStats.date ?? INITIAL_DAILY_STATS.date,
			completedBlocks: initialStats.completedBlocks ?? INITIAL_DAILY_STATS.completedBlocks,
			accumulatedMinutes: initialStats.accumulatedMinutes ?? INITIAL_DAILY_STATS.accumulatedMinutes
		};
	}

	loadStats(): DailyStats {
		return { ...this.stats };
	}

	saveStats(stats: DailyStats): void {
		this.stats = { ...stats };
		this.saveStatsCalls.push({ ...stats });
	}

	resetStats(): void {
		this.resetStatsCalls++;
		this.stats = {
			date: this.stats.date,
			completedBlocks: 0,
			accumulatedMinutes: 0
		};
	}
}
