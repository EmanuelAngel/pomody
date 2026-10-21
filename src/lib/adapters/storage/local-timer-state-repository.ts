import type { TimerSnapshotRecord } from '../../domain/timer/timer-snapshot.entity';
import { sanitizeTimerSnapshot } from '../../domain/timer/timer-snapshot.entity';
import type { ITimerStateRepository } from '../../domain/ports/timer-state-repository.port';
import { InMemoryStorage } from './in-memory-storage';

export const TIMER_STATE_STORAGE_KEY = 'pomody:timer-state';
export const TIMER_STATE_STORAGE_VERSION = 1;

export interface StoredTimerStateEnvelope {
	readonly version: number;
	readonly snapshot: TimerSnapshotRecord;
}

/**
 * Web Storage implementation of ITimerStateRepository.
 * Persists the timer execution snapshot in a versioned envelope with defensive validation.
 * Falls back to InMemoryStorage in SSR/Node and absorbs storage exceptions.
 */
export class LocalTimerStateRepository implements ITimerStateRepository {
	private readonly injectedStorage?: Storage;
	private fallbackStorage: InMemoryStorage | null = null;

	constructor(storage?: Storage) {
		this.injectedStorage = storage;
	}

	private getStorage(): Storage {
		if (this.injectedStorage !== undefined) {
			return this.injectedStorage;
		}

		if (typeof window !== 'undefined' && typeof window.localStorage !== 'undefined') {
			try {
				return window.localStorage;
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
	 * Reads and sanitizes the persisted snapshot.
	 * Returns null when missing, stored by an unsupported/newer version, or corrupt.
	 */
	public async load(): Promise<TimerSnapshotRecord | null> {
		const storage = this.getStorage();

		let raw: string | null;
		try {
			raw = storage.getItem(TIMER_STATE_STORAGE_KEY);
		} catch {
			return null;
		}

		if (!raw || raw.trim().length === 0) {
			return null;
		}

		let parsed: unknown;
		try {
			parsed = JSON.parse(raw);
		} catch {
			return null;
		}

		if (typeof parsed !== 'object' || parsed === null) {
			return null;
		}

		const envelope = parsed as Record<string, unknown>;
		if (envelope.version !== TIMER_STATE_STORAGE_VERSION) {
			return null;
		}

		return sanitizeTimerSnapshot(envelope.snapshot);
	}

	/**
	 * Validates and writes the snapshot. Invalid records are rejected before touching storage.
	 */
	public async save(snapshot: TimerSnapshotRecord): Promise<void> {
		const sanitized = sanitizeTimerSnapshot(snapshot);
		if (!sanitized) {
			console.error('Refusing to persist an invalid timer snapshot.');
			return;
		}

		const storage = this.getStorage();

		if (this.hasNewerVersionStored(storage)) {
			console.warn(
				`Storage contains a newer envelope version than supported (${TIMER_STATE_STORAGE_VERSION}). Write aborted to prevent data loss.`
			);
			return;
		}

		const envelope: StoredTimerStateEnvelope = {
			version: TIMER_STATE_STORAGE_VERSION,
			snapshot: sanitized
		};

		try {
			storage.setItem(TIMER_STATE_STORAGE_KEY, JSON.stringify(envelope));
		} catch (err) {
			console.error('Failed to write timer snapshot to storage:', err);
		}
	}

	/**
	 * Removes the persisted snapshot.
	 */
	public async clear(): Promise<void> {
		const storage = this.getStorage();

		if (this.hasNewerVersionStored(storage)) {
			console.warn(
				`Storage contains a newer envelope version than supported (${TIMER_STATE_STORAGE_VERSION}). Clear aborted to prevent data loss.`
			);
			return;
		}

		try {
			storage.removeItem(TIMER_STATE_STORAGE_KEY);
		} catch (err) {
			console.error('Failed to clear timer snapshot from storage:', err);
		}
	}

	/**
	 * Checks whether storage contains an envelope with a newer version than supported.
	 */
	private hasNewerVersionStored(storage: Storage): boolean {
		try {
			const raw = storage.getItem(TIMER_STATE_STORAGE_KEY);
			if (!raw) {
				return false;
			}
			const parsed: unknown = JSON.parse(raw);
			if (typeof parsed !== 'object' || parsed === null) {
				return false;
			}
			const envelope = parsed as Record<string, unknown>;
			return typeof envelope.version === 'number' && envelope.version > TIMER_STATE_STORAGE_VERSION;
		} catch {
			return false;
		}
	}
}
