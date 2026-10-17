import type { IDistractionWhitelistRepository } from '../../domain/ports/distraction-repository.port';

export const DISTRACTION_WHITELIST_STORAGE_KEY = 'pomody:distraction-whitelist';
export const DISTRACTION_WHITELIST_STORAGE_VERSION = 1;

export interface StoredDistractionWhitelistEnvelope {
	readonly version: number;
	readonly silencedUntil: string;
	readonly ruleIds: readonly string[];
}

interface ReadWhitelist {
	readonly silencedUntil: string;
	readonly ruleIds: readonly string[];
}

/**
 * Filters a raw rule id list down to unique, trimmed, non-empty strings, preserving order.
 */
export function sanitizeRuleIds(raw: unknown): string[] {
	if (!Array.isArray(raw)) {
		return [];
	}

	const ruleIds: string[] = [];
	for (const entry of raw) {
		if (typeof entry !== 'string') {
			continue;
		}

		const trimmed = entry.trim();
		if (trimmed.length === 0 || ruleIds.includes(trimmed)) {
			continue;
		}

		ruleIds.push(trimmed);
	}

	return ruleIds;
}

/**
 * Browser LocalStorage implementation of IDistractionWhitelistRepository.
 *
 * Persists a single local day: the envelope holds `silencedUntil` plus the rules silenced
 * for that day, so the whitelist can never grow without bound. There are no timers and no
 * periodic writes: the list is purged lazily when it is read on a different day.
 *
 * Callers pass the local date (`YYYY-MM-DD`); the adapter never reads the clock itself.
 * Safe for use in SSR/Node and resilient against storage exceptions (e.g. QuotaExceededError, SecurityError).
 */
export class LocalStorageDistractionWhitelistRepository implements IDistractionWhitelistRepository {
	private readonly injectedStorage?: Storage;

	constructor(storage?: Storage) {
		this.injectedStorage = storage;
	}

	/**
	 * Checks injected storage, then window.localStorage with try/catch for SSR and SecurityError.
	 */
	public getStorage(): Storage | null {
		if (this.injectedStorage !== undefined) {
			return this.injectedStorage;
		}

		if (typeof window !== 'undefined') {
			try {
				return window.localStorage;
			} catch {
				return null;
			}
		}

		return null;
	}

	/**
	 * Returns the rules silenced for the given local date.
	 * The date is normalized like the write path (`silence` / `unsilence`), so a read can
	 * never purge the day it was asked about: invalid input returns an empty list without
	 * touching storage, and the stored list is purged only when the day genuinely changed.
	 */
	public async getSilenced(dateKey: string): Promise<readonly string[]> {
		if (typeof dateKey !== 'string') {
			return Object.freeze([]);
		}

		const trimmedDate = dateKey.trim();
		if (trimmedDate.length === 0) {
			return Object.freeze([]);
		}

		const envelope = this.readEnvelope();
		if (envelope === null) {
			return Object.freeze([]);
		}

		if (envelope.silencedUntil !== trimmedDate) {
			this.removeEnvelope();
			return Object.freeze([]);
		}

		return Object.freeze([...envelope.ruleIds]);
	}

	/**
	 * Silences a rule for the given local date.
	 * Switching to a new day starts a fresh list; repeating a rule is idempotent.
	 * Invalid input is ignored.
	 */
	public async silence(ruleId: string, dateKey: string): Promise<void> {
		if (typeof ruleId !== 'string' || typeof dateKey !== 'string') {
			return;
		}

		const trimmedId = ruleId.trim();
		const trimmedDate = dateKey.trim();
		if (trimmedId.length === 0 || trimmedDate.length === 0) {
			return;
		}

		const envelope = this.readEnvelope();
		const ruleIds =
			envelope !== null && envelope.silencedUntil === trimmedDate ? [...envelope.ruleIds] : [];

		if (!ruleIds.includes(trimmedId)) {
			ruleIds.push(trimmedId);
		}

		this.writeEnvelope({
			version: DISTRACTION_WHITELIST_STORAGE_VERSION,
			silencedUntil: trimmedDate,
			ruleIds
		});
	}

	/**
	 * Lifts the silence of a single rule for the given local date.
	 * A no-op when the rule is not silenced, when the stored day is not `dateKey`, or on
	 * invalid input. The key is removed once the last silence of the day is lifted.
	 * Unlike a read, this never purges a stale day: the read path owns that.
	 */
	public async unsilence(ruleId: string, dateKey: string): Promise<void> {
		if (typeof ruleId !== 'string' || typeof dateKey !== 'string') {
			return;
		}

		const trimmedId = ruleId.trim();
		const trimmedDate = dateKey.trim();
		if (trimmedId.length === 0 || trimmedDate.length === 0) {
			return;
		}

		const envelope = this.readEnvelope();
		if (envelope === null || envelope.silencedUntil !== trimmedDate) {
			return;
		}

		const remaining = envelope.ruleIds.filter((id) => id !== trimmedId);
		if (remaining.length === envelope.ruleIds.length) {
			return;
		}

		if (remaining.length === 0) {
			this.removeEnvelope();
			return;
		}

		this.writeEnvelope({
			version: DISTRACTION_WHITELIST_STORAGE_VERSION,
			silencedUntil: trimmedDate,
			ruleIds: remaining
		});
	}

	/**
	 * Calls storage.removeItem(DISTRACTION_WHITELIST_STORAGE_KEY) safely.
	 * Must NOT touch any other key (such as pomody:settings).
	 */
	public async clearAll(): Promise<void> {
		this.removeEnvelope();
	}

	/**
	 * Reads the whitelist envelope.
	 * Returns null when storage is inaccessible, empty, corrupt, or version-mismatched —
	 * in that case nothing is purged, because the payload may belong to a newer build.
	 */
	private readEnvelope(): ReadWhitelist | null {
		const storage = this.getStorage();
		if (!storage) {
			return null;
		}

		let raw: string | null;
		try {
			raw = storage.getItem(DISTRACTION_WHITELIST_STORAGE_KEY);
		} catch {
			return null;
		}

		if (!raw) {
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
		if (
			envelope.version !== DISTRACTION_WHITELIST_STORAGE_VERSION ||
			typeof envelope.silencedUntil !== 'string' ||
			!Array.isArray(envelope.ruleIds)
		) {
			return null;
		}

		return {
			silencedUntil: envelope.silencedUntil,
			ruleIds: sanitizeRuleIds(envelope.ruleIds)
		};
	}

	/**
	 * Writes the whitelist envelope with defensive exception handling.
	 */
	private writeEnvelope(envelope: StoredDistractionWhitelistEnvelope): void {
		const storage = this.getStorage();
		if (!storage) {
			return;
		}

		if (this.hasNewerVersionStored(storage)) {
			console.warn(
				`Storage contains a newer envelope version than supported (${DISTRACTION_WHITELIST_STORAGE_VERSION}). Write aborted to prevent data loss.`
			);
			return;
		}

		try {
			storage.setItem(DISTRACTION_WHITELIST_STORAGE_KEY, JSON.stringify(envelope));
		} catch (err) {
			console.error('Failed to write distraction whitelist to storage:', err);
		}
	}

	/**
	 * Removes the whitelist key with defensive exception handling.
	 */
	private removeEnvelope(): void {
		const storage = this.getStorage();
		if (!storage) {
			return;
		}

		try {
			storage.removeItem(DISTRACTION_WHITELIST_STORAGE_KEY);
		} catch {
			// Gracefully handle DOMException / SecurityError
		}
	}

	/**
	 * Checks whether storage contains an envelope with a newer version than supported.
	 */
	private hasNewerVersionStored(storage: Storage): boolean {
		try {
			const raw = storage.getItem(DISTRACTION_WHITELIST_STORAGE_KEY);
			if (!raw) {
				return false;
			}
			const parsed: unknown = JSON.parse(raw);
			if (typeof parsed !== 'object' || parsed === null) {
				return false;
			}
			const envelope = parsed as Record<string, unknown>;
			return (
				typeof envelope.version === 'number' &&
				envelope.version > DISTRACTION_WHITELIST_STORAGE_VERSION
			);
		} catch {
			return false;
		}
	}
}
