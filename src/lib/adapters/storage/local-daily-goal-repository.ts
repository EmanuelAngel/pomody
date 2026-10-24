import { InMemoryStorage } from './in-memory-storage';
import {
	applyGoalChange,
	sanitizeDailyGoalChange,
	validateDailyGoalChange,
	type DailyGoalChange
} from '../../domain/goals/daily-goal.entity';
import type { IDailyGoalRepository } from '../../domain/ports/daily-goal-repository.port';

export const DAILY_GOAL_STORAGE_KEY = 'pomody:daily-goal';
export const DAILY_GOAL_STORAGE_VERSION = 1;

export interface StoredDailyGoalEnvelope {
	readonly version: number;
	readonly changes: readonly DailyGoalChange[];
}

/**
 * Web Storage implementation of IDailyGoalRepository.
 *
 * Persists the goal changes in a versioned envelope, with defensive validation and self-healing:
 * corrupt changes are dropped one by one, never wiping the valid ones. Every write re-reads storage
 * first so another tab's change is not overwritten by a stale copy. A newer stored version is never
 * overwritten. Safe for use in SSR/Node and resilient against storage exceptions
 * (QuotaExceededError, SecurityError).
 */
export class LocalDailyGoalRepository implements IDailyGoalRepository {
	private readonly injectedStorage?: Storage;
	private fallbackStorage?: Storage;

	constructor(storage?: Storage) {
		this.injectedStorage = storage;
	}

	/**
	 * Checks injected storage, then window.localStorage with try/catch for SSR and SecurityError.
	 */
	private getStorage(): Storage {
		if (this.injectedStorage !== undefined) {
			return this.injectedStorage;
		}

		if (typeof window !== 'undefined') {
			try {
				// Reading the property is what throws a SecurityError, so the guard stays inside the try.
				if (typeof window.localStorage !== 'undefined') {
					return window.localStorage;
				}
			} catch {
				// SecurityError or blocked storage: fall through to the in-memory fallback.
			}
		}

		if (!this.fallbackStorage) {
			this.fallbackStorage = new InMemoryStorage();
		}

		return this.fallbackStorage;
	}

	/**
	 * Reads and sanitizes the persisted history.
	 * Returns an empty list when the payload is missing, stored by a newer version,
	 * unparseable, or not shaped as an envelope. Never writes.
	 */
	public async getHistory(): Promise<readonly DailyGoalChange[]> {
		return this.readHistory(this.getStorage());
	}

	/**
	 * Applies the change on top of the freshly re-read stored history and writes it back.
	 * An invalid change is dropped and a newer stored envelope is never overwritten.
	 */
	public async applyChange(change: DailyGoalChange): Promise<void> {
		const validation = validateDailyGoalChange(change);
		if (!validation.ok) {
			return;
		}

		const storage = this.getStorage();

		if (this.hasNewerVersionStored(storage)) {
			console.warn(
				`Storage contains a newer envelope version than supported (${DAILY_GOAL_STORAGE_VERSION}). Write aborted to prevent data loss.`
			);
			return;
		}

		const next = applyGoalChange(this.readHistory(storage), validation.change);

		const envelope: StoredDailyGoalEnvelope = {
			version: DAILY_GOAL_STORAGE_VERSION,
			changes: next
		};

		try {
			storage.setItem(DAILY_GOAL_STORAGE_KEY, JSON.stringify(envelope));
		} catch (err) {
			console.error('Failed to write daily goal to storage:', err);
		}
	}

	/**
	 * Listens to `storage` events, which the browser raises only in the other contexts that share
	 * the same localStorage. Without a window (SSR) there is nothing to observe.
	 */
	public onExternalChange(listener: () => void): () => void {
		if (typeof window === 'undefined') {
			return () => {};
		}

		const handler = (event: Event) => {
			const key = (event as StorageEvent).key;
			// A null key means the other context cleared the whole storage, our key included.
			if (key === DAILY_GOAL_STORAGE_KEY || key === null) {
				listener();
			}
		};

		window.addEventListener('storage', handler);
		return () => window.removeEventListener('storage', handler);
	}

	/**
	 * Sanitizes every stored change and folds them through `applyGoalChange`, so the result is
	 * sorted, holds one entry per day (the later one wins) and keeps no corrupt entry.
	 */
	private readHistory(storage: Storage): readonly DailyGoalChange[] {
		let raw: string | null;
		try {
			raw = storage.getItem(DAILY_GOAL_STORAGE_KEY);
		} catch {
			return Object.freeze([]);
		}

		if (!raw || raw.trim().length === 0) {
			return Object.freeze([]);
		}

		let parsed: unknown;
		try {
			parsed = JSON.parse(raw);
		} catch {
			return Object.freeze([]);
		}

		if (typeof parsed !== 'object' || parsed === null) {
			return Object.freeze([]);
		}

		const envelope = parsed as Record<string, unknown>;
		if (envelope.version !== DAILY_GOAL_STORAGE_VERSION || !Array.isArray(envelope.changes)) {
			return Object.freeze([]);
		}

		let history: readonly DailyGoalChange[] = Object.freeze([]);
		for (const rawChange of envelope.changes) {
			const sanitized = sanitizeDailyGoalChange(rawChange);
			if (sanitized !== null) {
				history = applyGoalChange(history, sanitized);
			}
		}

		return history;
	}

	/**
	 * Checks whether storage contains an envelope with a newer version than supported.
	 */
	private hasNewerVersionStored(storage: Storage): boolean {
		let raw: string | null;
		try {
			raw = storage.getItem(DAILY_GOAL_STORAGE_KEY);
		} catch {
			return false;
		}

		if (!raw) {
			return false;
		}

		try {
			const parsed = JSON.parse(raw) as Record<string, unknown> | null;
			if (typeof parsed !== 'object' || parsed === null) {
				return false;
			}

			const version = parsed.version;
			return typeof version === 'number' && version > DAILY_GOAL_STORAGE_VERSION;
		} catch {
			return false;
		}
	}
}
