import { InMemoryStorage } from './in-memory-storage';
import {
	sanitizeActivityLogEntry,
	trimActivityToRetention,
	type ActivityLogEntry
} from '../../domain/activity/activity-log-entry.entity';
import type { IActivityLogRepository } from '../../domain/ports/activity-log-repository.port';

export const ACTIVITY_LOG_STORAGE_KEY = 'pomody:activity-log';
export const ACTIVITY_LOG_STORAGE_VERSION = 1;

/**
 * Web Storage implementation of IActivityLogRepository: a versioned envelope, sanitized entry by
 * entry, re-read before every append so another tab's entries survive. Never throws.
 */
export class LocalActivityLogRepository implements IActivityLogRepository {
	private readonly injectedStorage?: Storage;
	private readonly nowProvider: () => Date;
	private fallbackStorage?: Storage;

	constructor(storage?: Storage, nowProvider: () => Date = () => new Date()) {
		this.injectedStorage = storage;
		this.nowProvider = nowProvider;
	}

	private getStorage(): Storage {
		if (this.injectedStorage !== undefined) return this.injectedStorage;
		if (typeof window !== 'undefined') {
			try {
				if (typeof window.localStorage !== 'undefined') return window.localStorage;
			} catch {
				// SecurityError or blocked storage: fall through to the in-memory fallback.
			}
		}
		this.fallbackStorage ??= new InMemoryStorage();
		return this.fallbackStorage;
	}

	public async getAll(): Promise<readonly ActivityLogEntry[]> {
		return Object.freeze(this.readEntries(this.getStorage()).sort((a, b) => a.at - b.at));
	}

	public async append(entry: ActivityLogEntry): Promise<void> {
		const sanitized = sanitizeActivityLogEntry(entry);
		if (sanitized === null) return;

		const storage = this.getStorage();
		const stored = this.readEnvelope(storage);
		if (stored !== null && typeof stored.version === 'number') {
			if (stored.version > ACTIVITY_LOG_STORAGE_VERSION) return;
		}

		const next = trimActivityToRetention(
			[...this.readEntries(storage), sanitized],
			this.nowProvider()
		).sort((a, b) => a.at - b.at);
		try {
			storage.setItem(
				ACTIVITY_LOG_STORAGE_KEY,
				JSON.stringify({ version: ACTIVITY_LOG_STORAGE_VERSION, entries: next })
			);
		} catch (error) {
			// The trace is never worth breaking the timer.
			console.error('Failed to write the activity log to storage:', error);
		}
	}

	public onExternalChange(listener: () => void): () => void {
		if (typeof window === 'undefined') return () => {};
		const handler = (event: Event) => {
			const key = (event as StorageEvent).key;
			if (key === ACTIVITY_LOG_STORAGE_KEY || key === null) listener();
		};
		window.addEventListener('storage', handler);
		return () => window.removeEventListener('storage', handler);
	}

	private readEnvelope(storage: Storage): Record<string, unknown> | null {
		try {
			const raw = storage.getItem(ACTIVITY_LOG_STORAGE_KEY);
			if (!raw) return null;
			const parsed: unknown = JSON.parse(raw);
			return typeof parsed === 'object' && parsed !== null
				? (parsed as Record<string, unknown>)
				: null;
		} catch {
			return null;
		}
	}

	private readEntries(storage: Storage): ActivityLogEntry[] {
		const envelope = this.readEnvelope(storage);
		if (
			envelope === null ||
			envelope.version !== ACTIVITY_LOG_STORAGE_VERSION ||
			!Array.isArray(envelope.entries)
		) {
			return [];
		}
		return envelope.entries
			.map(sanitizeActivityLogEntry)
			.filter((entry): entry is ActivityLogEntry => entry !== null);
	}
}
