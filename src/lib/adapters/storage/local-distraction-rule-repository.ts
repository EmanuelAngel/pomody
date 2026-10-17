import {
	normalizeExe,
	type DistractionRule
} from '../../domain/distraction/distraction-rule.entity';
import type { IDistractionRuleRepository } from '../../domain/ports/distraction-repository.port';

export const DISTRACTION_RULES_STORAGE_KEY = 'pomody:distraction-rules';
export const DISTRACTION_RULES_STORAGE_VERSION = 1;

export interface StoredDistractionRulesEnvelope {
	readonly version: number;
	readonly rules: readonly DistractionRule[];
}

/**
 * Defensive validation checking that raw input matches the DistractionRule shape:
 * - id: non-empty string, trimmed
 * - exe: string that normalizes to a non-empty executable key
 * - titlePattern: undefined, or a string trimmed to a non-empty substring
 * - createdAt: finite number > 0
 *
 * Returns a frozen DistractionRule or null if corrupt. The executable is always
 * normalized on the way in, so the stored key always satisfies the entity invariant.
 */
export function sanitizeDistractionRule(raw: unknown): DistractionRule | null {
	if (typeof raw !== 'object' || raw === null) {
		return null;
	}

	const candidate = raw as Record<string, unknown>;

	if (typeof candidate.id !== 'string') {
		return null;
	}

	const trimmedId = candidate.id.trim();
	if (trimmedId.length === 0) {
		return null;
	}

	if (typeof candidate.exe !== 'string') {
		return null;
	}

	const exe = normalizeExe(candidate.exe);
	if (exe.length === 0) {
		return null;
	}

	let titlePattern: string | undefined = undefined;
	if (candidate.titlePattern !== undefined && candidate.titlePattern !== null) {
		if (typeof candidate.titlePattern !== 'string') {
			return null;
		}

		const trimmedPattern = candidate.titlePattern.trim();
		if (trimmedPattern.length > 0) {
			titlePattern = trimmedPattern;
		}
	}

	if (
		typeof candidate.createdAt !== 'number' ||
		!Number.isFinite(candidate.createdAt) ||
		candidate.createdAt <= 0
	) {
		return null;
	}

	const rule: DistractionRule = {
		id: trimmedId,
		exe,
		createdAt: candidate.createdAt,
		...(titlePattern !== undefined ? { titlePattern } : {})
	};

	return Object.freeze(rule);
}

/**
 * Browser LocalStorage implementation of IDistractionRuleRepository.
 * Persists only the declared rules, in a versioned envelope with defensive validation.
 * An empty list is a legitimate state, never corruption: there is no seed catalogue here,
 * because a rule exists only when the user created it.
 * Safe for use in SSR/Node and resilient against storage exceptions (e.g. QuotaExceededError, SecurityError).
 */
export class LocalStorageDistractionRuleRepository implements IDistractionRuleRepository {
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
	 * Sanitization helper delegating to sanitizeDistractionRule.
	 */
	public sanitizeDistractionRule(raw: unknown): DistractionRule | null {
		return sanitizeDistractionRule(raw);
	}

	/**
	 * Returns the declared rules in insertion order.
	 */
	public async getAll(): Promise<readonly DistractionRule[]> {
		return Object.freeze(this.readRules());
	}

	/**
	 * Upserts a rule by id and writes the envelope to storage.
	 */
	public async save(rule: DistractionRule): Promise<void> {
		const sanitized = sanitizeDistractionRule(rule);
		if (!sanitized) {
			return;
		}

		const current = this.readRules();
		const index = current.findIndex((candidate) => candidate.id === sanitized.id);
		const next = [...current];

		if (index >= 0) {
			next[index] = sanitized;
		} else {
			next.push(sanitized);
		}

		this.writeRules(next);
	}

	/**
	 * Removes a rule by id and writes the envelope to storage.
	 */
	public async delete(ruleId: string): Promise<void> {
		const current = this.readRules();
		this.writeRules(current.filter((rule) => rule.id !== ruleId));
	}

	/**
	 * Calls storage.removeItem(DISTRACTION_RULES_STORAGE_KEY) safely.
	 * Must NOT touch any other key (such as pomody:settings).
	 */
	public async clearAll(): Promise<void> {
		const storage = this.getStorage();
		if (!storage) {
			return;
		}

		try {
			storage.removeItem(DISTRACTION_RULES_STORAGE_KEY);
		} catch {
			// Gracefully handle DOMException / SecurityError
		}
	}

	/**
	 * Reads and sanitizes rules from storage.
	 * Returns an empty array when storage is inaccessible, empty, corrupt, or version-mismatched.
	 */
	private readRules(): DistractionRule[] {
		const storage = this.getStorage();
		if (!storage) {
			return [];
		}

		let raw: string | null;
		try {
			raw = storage.getItem(DISTRACTION_RULES_STORAGE_KEY);
		} catch {
			return [];
		}

		if (!raw) {
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
		if (envelope.version !== DISTRACTION_RULES_STORAGE_VERSION || !Array.isArray(envelope.rules)) {
			return [];
		}

		const rules: DistractionRule[] = [];
		for (const rawRule of envelope.rules) {
			const sanitized = sanitizeDistractionRule(rawRule);
			if (sanitized !== null) {
				rules.push(sanitized);
			}
		}

		return rules;
	}

	/**
	 * Writes the envelope to storage with defensive exception handling.
	 */
	private writeRules(rules: readonly DistractionRule[]): void {
		const storage = this.getStorage();
		if (!storage) {
			return;
		}

		if (this.hasNewerVersionStored(storage)) {
			console.warn(
				`Storage contains a newer envelope version than supported (${DISTRACTION_RULES_STORAGE_VERSION}). Write aborted to prevent data loss.`
			);
			return;
		}

		const envelope: StoredDistractionRulesEnvelope = {
			version: DISTRACTION_RULES_STORAGE_VERSION,
			rules
		};

		try {
			storage.setItem(DISTRACTION_RULES_STORAGE_KEY, JSON.stringify(envelope));
		} catch (err) {
			console.error('Failed to write distraction rules to storage:', err);
		}
	}

	/**
	 * Checks whether storage contains an envelope with a newer version than supported.
	 */
	private hasNewerVersionStored(storage: Storage): boolean {
		try {
			const raw = storage.getItem(DISTRACTION_RULES_STORAGE_KEY);
			if (!raw) {
				return false;
			}
			const parsed: unknown = JSON.parse(raw);
			if (typeof parsed !== 'object' || parsed === null) {
				return false;
			}
			const envelope = parsed as Record<string, unknown>;
			return (
				typeof envelope.version === 'number' && envelope.version > DISTRACTION_RULES_STORAGE_VERSION
			);
		} catch {
			return false;
		}
	}
}
