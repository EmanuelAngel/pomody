/**
 * Domain entity representing aggregated focus statistics for a single calendar day.
 */
export interface DailyStats {
	/** Calendar date in ISO format (YYYY-MM-DD). */
	readonly date: string;
	/** Number of successfully completed focus blocks for the date. */
	readonly completedBlocks: number;
	/** Total accumulated focus time in minutes for the date. */
	readonly accumulatedMinutes: number;
}

/**
 * Clean initial state for daily stats.
 */
export const INITIAL_DAILY_STATS: DailyStats = Object.freeze({
	date: '',
	completedBlocks: 0,
	accumulatedMinutes: 0
});

/**
 * Domain port defining persistence operations for daily focus statistics.
 * Follows Hexagonal Architecture: pure TypeScript, zero dependencies on DOM, Svelte, or Tauri.
 */
export interface IDailyStatsRepository {
	/**
	 * Loads daily focus statistics from persistent storage.
	 * If no record exists or if the date has rolled over, implementations should return clean initial stats.
	 */
	loadStats(): DailyStats;

	/**
	 * Persists updated daily focus statistics.
	 */
	saveStats(stats: DailyStats): void;

	/**
	 * Resets daily focus statistics to zero for the current date.
	 */
	resetStats(): void;
}
