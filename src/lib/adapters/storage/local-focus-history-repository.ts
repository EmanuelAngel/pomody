import { InMemoryStorage } from './in-memory-storage';
import {
	sanitizeFocusHistoryEntry,
	trimToRetention,
	type FocusHistoryEntry
} from '../../domain/history/focus-history-entry.entity';
import type { IFocusHistoryRepository } from '../../domain/ports/focus-history-repository.port';

export const FOCUS_HISTORY_STORAGE_KEY = 'pomody:focus-history';
export const FOCUS_HISTORY_STORAGE_VERSION = 1;

/** Share of the oldest entries dropped when a write hits the storage quota. */
const QUOTA_TRIM_RATIO = 0.1;

export interface StoredFocusHistoryEnvelope {
	readonly version: number;
	readonly entries: readonly FocusHistoryEntry[];
}

function sortChronologically(entries: readonly FocusHistoryEntry[]): FocusHistoryEntry[] {
	return [...entries].sort((a, b) => a.endedAt - b.endedAt);
}

/**
 * Web Storage implementation of IFocusHistoryRepository.
 *
 * Persists one entry per finished block in a versioned envelope, with defensive validation and
 * self-healing: corrupt entries are dropped one by one, never wiping the valid ones. Every append
 * re-reads storage first so another tab's entries are not overwritten by a stale copy.
 * Safe for use in SSR/Node and resilient against storage exceptions (QuotaExceededError, SecurityError).
 */
export class LocalFocusHistoryRepository implements IFocusHistoryRepository {
	private readonly injectedStorage?: Storage;
	private readonly nowProvider: () => Date;
	private fallbackStorage?: Storage;

	constructor(storage?: Storage, nowProvider: () => Date = () => new Date()) {
		this.injectedStorage = storage;
		this.nowProvider = nowProvider;
	}

	/**
	 * Checks injected storage, then window.localStorage with try/catch for SSR and SecurityError.
	 */
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
	 * Reads and sanitizes the persisted history in chronological order.
	 * Returns an empty list when the payload is missing, stored by a newer version,
	 * unparseable, or not shaped as an envelope. Never writes.
	 */
	public async getAll(): Promise<readonly FocusHistoryEntry[]> {
		return Object.freeze(sortChronologically(this.readEntries(this.getStorage())));
	}

	/**
	 * Adds an entry on top of the freshly re-read stored history, trims what is past the retention
	 * window and writes it back. An invalid entry is dropped and a newer stored envelope is never overwritten.
	 */
	public async append(entry: FocusHistoryEntry): Promise<void> {
		const sanitized = sanitizeFocusHistoryEntry(entry);
		if (sanitized === null) {
			return;
		}

		const storage = this.getStorage();

		if (this.hasNewerVersionStored(storage)) {
			console.warn(
				`Storage contains a newer envelope version than supported (${FOCUS_HISTORY_STORAGE_VERSION}). Write aborted to prevent data loss.`
			);
			return;
		}

		const current = this.readEntries(storage);
		const next = sortChronologically(trimToRetention([...current, sanitized], this.nowProvider()));

		this.writeWithQuotaRetry(storage, next);
	}

	/**
	 * Removes the history key. Must NOT touch any other key.
	 */
	public async clearAll(): Promise<void> {
		try {
			this.getStorage().removeItem(FOCUS_HISTORY_STORAGE_KEY);
		} catch {
			// Gracefully handle DOMException / SecurityError
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
			if (key === FOCUS_HISTORY_STORAGE_KEY || key === null) {
				listener();
			}
		};

		window.addEventListener('storage', handler);
		return () => window.removeEventListener('storage', handler);
	}

	private readEntries(storage: Storage): FocusHistoryEntry[] {
		let raw: string | null;
		try {
			raw = storage.getItem(FOCUS_HISTORY_STORAGE_KEY);
		} catch {
			return [];
		}

		if (!raw || raw.trim().length === 0) {
			return [];
		}

		let parsed: unknown;
		try {
			parsed = JSON.parse(raw);
		} catch {
			return [];
		}

		if (typeof parsed !== 'object' || parsed === null) {
			return [];
		}

		const envelope = parsed as Record<string, unknown>;
		if (envelope.version !== FOCUS_HISTORY_STORAGE_VERSION || !Array.isArray(envelope.entries)) {
			return [];
		}

		const entries: FocusHistoryEntry[] = [];
		for (const rawEntry of envelope.entries) {
			const sanitized = sanitizeFocusHistoryEntry(rawEntry);
			if (sanitized !== null) {
				entries.push(sanitized);
			}
		}

		return entries;
	}

	/**
	 * On a failed write (typically the quota) drops the oldest 10% (at least one) and retries once.
	 * A second failure discards the write without throwing: the history is never worth breaking the timer.
	 */
	private writeWithQuotaRetry(storage: Storage, entries: readonly FocusHistoryEntry[]): void {
		try {
			this.writeEntries(storage, entries);
			return;
		} catch (err) {
			if (entries.length <= 1) {
				console.error('Failed to write focus history to storage:', err);
				return;
			}
		}

		const dropCount = Math.max(1, Math.ceil(entries.length * QUOTA_TRIM_RATIO));
		try {
			this.writeEntries(storage, entries.slice(dropCount));
		} catch (err) {
			console.error('Failed to write focus history to storage:', err);
		}
	}

	private writeEntries(storage: Storage, entries: readonly FocusHistoryEntry[]): void {
		const envelope: StoredFocusHistoryEnvelope = {
			version: FOCUS_HISTORY_STORAGE_VERSION,
			entries
		};

		storage.setItem(FOCUS_HISTORY_STORAGE_KEY, JSON.stringify(envelope));
	}

	/**
	 * Checks whether storage contains an envelope with a newer version than supported.
	 */
	private hasNewerVersionStored(storage: Storage): boolean {
		let raw: string | null;
		try {
			raw = storage.getItem(FOCUS_HISTORY_STORAGE_KEY);
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
			return typeof version === 'number' && version > FOCUS_HISTORY_STORAGE_VERSION;
		} catch {
			return false;
		}
	}
}
