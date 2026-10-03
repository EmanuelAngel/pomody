import type {
	DailyStats,
	IDailyStatsRepository
} from '../../domain/ports/daily-stats-repository.port';

export const DAILY_STATS_STORAGE_KEY = 'pomody:daily-stats';
export const DAILY_STATS_STORAGE_VERSION = 1;

export interface StoredDailyStatsEnvelope {
	readonly version: number;
	readonly stats: DailyStats;
}

/**
 * Returns the calendar date formatted as YYYY-MM-DD in local time.
 */
export function getLocalDateString(date: Date = new Date()): string {
	const year = date.getFullYear();
	const month = String(date.getMonth() + 1).padStart(2, '0');
	const day = String(date.getDate()).padStart(2, '0');
	return `${year}-${month}-${day}`;
}

function isValidNonNegativeInteger(value: unknown): value is number {
	return (
		typeof value === 'number' && Number.isFinite(value) && Number.isInteger(value) && value >= 0
	);
}

/**
 * Browser LocalStorage implementation of IDailyStatsRepository.
 * Persists daily aggregated focus statistics under 'pomody:daily-stats'.
 * Automatically resets counts to 0 when the local calendar day rolls over.
 * Fully safe for SSR and resilient against storage exceptions.
 */
export class LocalDailyStatsRepository implements IDailyStatsRepository {
	private readonly injectedStorage?: Storage;
	private readonly nowProvider: () => Date;

	constructor(storage?: Storage, nowProvider: () => Date = () => new Date()) {
		this.injectedStorage = storage;
		this.nowProvider = nowProvider;
	}

	private getStorage(): Storage | null {
		if (this.injectedStorage !== undefined) {
			return this.injectedStorage;
		}

		if (typeof window !== 'undefined' && typeof window.localStorage !== 'undefined') {
			try {
				return window.localStorage;
			} catch {
				return null;
			}
		}

		return null;
	}

	private createCleanStats(dateStr?: string): DailyStats {
		return {
			date: dateStr ?? getLocalDateString(this.nowProvider()),
			completedBlocks: 0,
			accumulatedMinutes: 0
		};
	}

	/**
	 * Loads daily focus statistics from local storage.
	 * If storage is empty, inaccessible, invalid, or the date has rolled over,
	 * returns clean initial stats for today.
	 */
	public loadStats(): DailyStats {
		const today = getLocalDateString(this.nowProvider());
		const storage = this.getStorage();
		if (!storage) {
			return this.createCleanStats(today);
		}

		let raw: string | null;
		try {
			raw = storage.getItem(DAILY_STATS_STORAGE_KEY);
		} catch {
			return this.createCleanStats(today);
		}

		if (!raw) {
			return this.createCleanStats(today);
		}

		let parsed: unknown;
		try {
			parsed = JSON.parse(raw);
		} catch {
			return this.createCleanStats(today);
		}

		if (typeof parsed !== 'object' || parsed === null) {
			return this.createCleanStats(today);
		}

		const envelope = parsed as Partial<StoredDailyStatsEnvelope>;
		const stats = envelope.stats;

		if (typeof stats !== 'object' || stats === null) {
			return this.createCleanStats(today);
		}

		const storedDate = stats.date;
		const completedBlocks = stats.completedBlocks;
		const accumulatedMinutes = stats.accumulatedMinutes;

		// Date mismatch check (midnight rollover)
		if (typeof storedDate !== 'string' || storedDate !== today) {
			return this.createCleanStats(today);
		}

		return {
			date: today,
			completedBlocks: isValidNonNegativeInteger(completedBlocks) ? completedBlocks : 0,
			accumulatedMinutes: isValidNonNegativeInteger(accumulatedMinutes) ? accumulatedMinutes : 0
		};
	}

	/**
	 * Persists updated daily focus statistics to local storage.
	 */
	public saveStats(stats: DailyStats): void {
		const storage = this.getStorage();
		if (!storage) {
			return;
		}

		const validatedStats: DailyStats = {
			date:
				typeof stats.date === 'string' && stats.date
					? stats.date
					: getLocalDateString(this.nowProvider()),
			completedBlocks: isValidNonNegativeInteger(stats.completedBlocks) ? stats.completedBlocks : 0,
			accumulatedMinutes: isValidNonNegativeInteger(stats.accumulatedMinutes)
				? stats.accumulatedMinutes
				: 0
		};

		const envelope: StoredDailyStatsEnvelope = {
			version: DAILY_STATS_STORAGE_VERSION,
			stats: validatedStats
		};

		try {
			storage.setItem(DAILY_STATS_STORAGE_KEY, JSON.stringify(envelope));
		} catch {
			// Fail-safe against quota or security errors
		}
	}

	/**
	 * Resets daily focus statistics to zero for the current local date.
	 */
	public resetStats(): void {
		const today = getLocalDateString(this.nowProvider());
		const cleanStats = this.createCleanStats(today);
		this.saveStats(cleanStats);
	}
}
