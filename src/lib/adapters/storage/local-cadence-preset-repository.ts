import { InMemoryStorage } from './in-memory-storage';
import {
	MAX_CUSTOM_CADENCE_PRESETS,
	sanitizeCadencePreset,
	type CadencePreset
} from '../../domain/planning/cadence-preset.entity';
import type { ICadencePresetRepository } from '../../domain/ports/cadence-preset-repository.port';

export const CADENCE_PRESETS_STORAGE_KEY = 'pomody:cadence-presets';
export const CADENCE_PRESETS_STORAGE_VERSION = 1;

export interface StoredCadencePresetsEnvelope {
	readonly version: number;
	readonly presets: readonly CadencePreset[];
}

/**
 * Web Storage implementation of ICadencePresetRepository.
 *
 * Persists the user's cadence presets in a versioned envelope, with defensive validation and
 * self-healing: corrupt entries are dropped one by one and every id is recomputed from its
 * values, so a damaged payload never takes down the whole list or breaks the view.
 * Safe for use in SSR/Node and resilient against storage exceptions (QuotaExceededError, SecurityError).
 */
export class LocalStorageCadencePresetRepository implements ICadencePresetRepository {
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
	 * Reads and sanitizes the persisted list.
	 * Returns an empty list when the payload is missing, stored by an unsupported/newer version,
	 * unparseable, or not shaped as an envelope.
	 */
	public async load(): Promise<readonly CadencePreset[]> {
		const storage = this.getStorage();

		let raw: string | null;
		try {
			raw = storage.getItem(CADENCE_PRESETS_STORAGE_KEY);
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
		if (envelope.version !== CADENCE_PRESETS_STORAGE_VERSION || !Array.isArray(envelope.presets)) {
			return Object.freeze([]);
		}

		return Object.freeze(this.sanitizeList(envelope.presets));
	}

	/**
	 * Validates and writes the list, replacing the previous payload.
	 * Invalid entries are dropped instead of persisted, and a newer stored envelope is never overwritten.
	 */
	public async save(presets: readonly CadencePreset[]): Promise<void> {
		const storage = this.getStorage();

		if (this.hasNewerVersionStored(storage)) {
			console.warn(
				`Storage contains a newer envelope version than supported (${CADENCE_PRESETS_STORAGE_VERSION}). Write aborted to prevent data loss.`
			);
			return;
		}

		const envelope: StoredCadencePresetsEnvelope = {
			version: CADENCE_PRESETS_STORAGE_VERSION,
			presets: this.sanitizeList(presets)
		};

		try {
			storage.setItem(CADENCE_PRESETS_STORAGE_KEY, JSON.stringify(envelope));
		} catch (err) {
			console.error('Failed to write cadence presets to storage:', err);
		}
	}

	/**
	 * Sanitizes every entry, drops the corrupt ones, collapses entries that resolve to the same
	 * derived id, and caps the list at the maximum number of custom presets.
	 */
	private sanitizeList(rawEntries: readonly unknown[]): CadencePreset[] {
		const presets: CadencePreset[] = [];
		const seenIds = new Set<string>();

		for (const rawEntry of rawEntries) {
			const sanitized = sanitizeCadencePreset(rawEntry);
			if (sanitized === null || seenIds.has(sanitized.id)) {
				continue;
			}

			seenIds.add(sanitized.id);
			presets.push(sanitized);

			if (presets.length >= MAX_CUSTOM_CADENCE_PRESETS) {
				break;
			}
		}

		return presets;
	}

	/**
	 * Checks whether storage contains an envelope with a newer version than supported.
	 */
	private hasNewerVersionStored(storage: Storage): boolean {
		let raw: string | null;
		try {
			raw = storage.getItem(CADENCE_PRESETS_STORAGE_KEY);
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
			return typeof version === 'number' && version > CADENCE_PRESETS_STORAGE_VERSION;
		} catch {
			return false;
		}
	}
}
