import type { BreakActivity, BreakCategory } from '../../domain/breaks/break-activity.entity';
import {
	BREAK_ACTIVITY_TITLE_MAX_LENGTH,
	BREAK_ACTIVITY_GUIDE_MAX_LENGTH,
	VALID_BREAK_CATEGORIES,
	PRESET_BREAK_ACTIVITIES
} from '../../domain/breaks/break-activity.entity';
import {
	type IBreakActivityRepository,
	sortBreakActivities
} from '../../domain/ports/break-activity-repository.port';

export const BREAK_ACTIVITIES_STORAGE_KEY = 'pomody:break-activities';
export const BREAK_ACTIVITIES_STORAGE_VERSION = 1;

export interface StoredBreakActivitiesEnvelope {
	readonly version: number;
	readonly activities: readonly BreakActivity[];
}

/**
 * Defensive validation checking that raw input matches BreakActivity shape:
 * - id: non-empty string
 * - title: string, trimmed, non-empty, length <= 120
 * - category: 'physical' | 'mindful' | 'hydration'
 * - durationMinutes: finite integer >= 1
 * - isPreset: boolean
 * - guide: undefined or string with trimmed length <= 500
 *
 * Returns a frozen BreakActivity or null if corrupt.
 */
export function sanitizeBreakActivity(raw: unknown): BreakActivity | null {
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

	if (typeof candidate.title !== 'string') {
		return null;
	}

	const trimmedTitle = candidate.title.trim();
	if (trimmedTitle.length === 0 || trimmedTitle.length > BREAK_ACTIVITY_TITLE_MAX_LENGTH) {
		return null;
	}

	if (
		typeof candidate.category !== 'string' ||
		!VALID_BREAK_CATEGORIES.includes(candidate.category as BreakCategory)
	) {
		return null;
	}

	if (
		typeof candidate.durationMinutes !== 'number' ||
		!Number.isInteger(candidate.durationMinutes) ||
		candidate.durationMinutes < 1
	) {
		return null;
	}

	if (typeof candidate.isPreset !== 'boolean') {
		return null;
	}

	let guide: string | undefined = undefined;
	if (candidate.guide !== undefined && candidate.guide !== null) {
		if (typeof candidate.guide !== 'string') {
			return null;
		}

		const trimmedGuide = candidate.guide.trim();
		if (trimmedGuide.length > BREAK_ACTIVITY_GUIDE_MAX_LENGTH) {
			return null;
		}

		if (trimmedGuide.length > 0) {
			guide = trimmedGuide;
		}
	}

	const activity: BreakActivity = {
		id: trimmedId,
		title: trimmedTitle,
		category: candidate.category as BreakCategory,
		durationMinutes: candidate.durationMinutes,
		isPreset: candidate.isPreset,
		...(guide !== undefined ? { guide } : {})
	};

	return Object.freeze(activity);
}

/**
 * Browser LocalStorage implementation of IBreakActivityRepository.
 * Persists break activities in a versioned envelope with defensive validation and self-healing.
 * Safe for use in SSR/Node and resilient against storage exceptions (e.g. QuotaExceededError, SecurityError).
 */
export class LocalStorageBreakActivityRepository implements IBreakActivityRepository {
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
	 * Sanitization helper delegating to sanitizeBreakActivity.
	 */
	public sanitizeBreakActivity(raw: unknown): BreakActivity | null {
		return sanitizeBreakActivity(raw);
	}

	/**
	 * Returns all sanitized break activities sorted deterministically via sortBreakActivities.
	 */
	public async getAll(): Promise<readonly BreakActivity[]> {
		const activities = this.readActivities();
		return sortBreakActivities(activities);
	}

	/**
	 * Returns break activities filtered by category and sorted deterministically.
	 */
	public async getByCategory(category: BreakCategory): Promise<readonly BreakActivity[]> {
		const activities = this.readActivities();
		const filtered = activities.filter((activity) => activity.category === category);
		return sortBreakActivities(filtered);
	}

	/**
	 * Upserts a break activity by id and writes envelope to storage.
	 */
	public async save(activity: BreakActivity): Promise<void> {
		const sanitized = this.sanitizeBreakActivity(activity);
		if (!sanitized) {
			return;
		}

		const current = this.readActivities();
		const index = current.findIndex((a) => a.id === sanitized.id);
		let nextActivities: BreakActivity[];

		if (index >= 0) {
			nextActivities = [...current];
			nextActivities[index] = sanitized;
		} else {
			nextActivities = [...current, sanitized];
		}

		this.writeActivities(nextActivities);
	}

	/**
	 * Removes a break activity by id and writes envelope to storage.
	 */
	public async delete(activityId: string): Promise<void> {
		const current = this.readActivities();
		const remaining = current.filter((a) => a.id !== activityId);
		this.writeActivities(remaining);
	}

	/**
	 * Resets storage back to default PRESET_BREAK_ACTIVITIES.
	 */
	public async resetToDefaults(): Promise<void> {
		this.writeActivities(PRESET_BREAK_ACTIVITIES);
	}

	/**
	 * Calls storage.removeItem(BREAK_ACTIVITIES_STORAGE_KEY) safely.
	 * Must NOT touch any other key (such as pomody:settings).
	 */
	public async clearAll(): Promise<void> {
		const storage = this.getStorage();
		if (!storage) {
			return;
		}

		try {
			storage.removeItem(BREAK_ACTIVITIES_STORAGE_KEY);
		} catch {
			// Gracefully handle DOMException / SecurityError
		}
	}

	/**
	 * Reads and sanitizes break activities from storage.
	 * If stored envelope is absent, empty, or corrupt, automatically seeds PRESET_BREAK_ACTIVITIES.
	 */
	private readActivities(): BreakActivity[] {
		const storage = this.getStorage();
		if (!storage) {
			return [...PRESET_BREAK_ACTIVITIES];
		}

		let raw: string | null;
		try {
			raw = storage.getItem(BREAK_ACTIVITIES_STORAGE_KEY);
		} catch {
			return [...PRESET_BREAK_ACTIVITIES];
		}

		if (!raw || raw.trim().length === 0) {
			const seeded = [...PRESET_BREAK_ACTIVITIES];
			this.writeActivities(seeded);
			return seeded;
		}

		let parsed: unknown;
		try {
			parsed = JSON.parse(raw);
		} catch {
			const seeded = [...PRESET_BREAK_ACTIVITIES];
			this.writeActivities(seeded);
			return seeded;
		}

		if (typeof parsed !== 'object' || parsed === null) {
			const seeded = [...PRESET_BREAK_ACTIVITIES];
			this.writeActivities(seeded);
			return seeded;
		}

		const envelope = parsed as Record<string, unknown>;
		if (
			envelope.version !== BREAK_ACTIVITIES_STORAGE_VERSION ||
			!Array.isArray(envelope.activities)
		) {
			const seeded = [...PRESET_BREAK_ACTIVITIES];
			if (!this.hasNewerVersionStored(storage)) {
				this.writeActivities(seeded);
			}
			return seeded;
		}

		const activities: BreakActivity[] = [];
		for (const rawActivity of envelope.activities) {
			const sanitized = this.sanitizeBreakActivity(rawActivity);
			if (sanitized !== null) {
				activities.push(sanitized);
			}
		}

		if (activities.length === 0) {
			const seeded = [...PRESET_BREAK_ACTIVITIES];
			this.writeActivities(seeded);
			return seeded;
		}

		return activities;
	}

	/**
	 * Writes envelope to storage with defensive exception handling.
	 */
	private writeActivities(activities: readonly BreakActivity[]): void {
		const storage = this.getStorage();
		if (!storage) {
			return;
		}

		if (this.hasNewerVersionStored(storage)) {
			console.warn(
				`Storage contains a newer envelope version than supported (${BREAK_ACTIVITIES_STORAGE_VERSION}). Write aborted to prevent data loss.`
			);
			return;
		}

		const envelope: StoredBreakActivitiesEnvelope = {
			version: BREAK_ACTIVITIES_STORAGE_VERSION,
			activities: sortBreakActivities(activities)
		};

		try {
			storage.setItem(BREAK_ACTIVITIES_STORAGE_KEY, JSON.stringify(envelope));
		} catch (err) {
			console.error('Failed to write break activities to storage:', err);
		}
	}

	/**
	 * Checks whether storage contains an envelope with a newer version than supported.
	 */
	private hasNewerVersionStored(storage: Storage): boolean {
		try {
			const raw = storage.getItem(BREAK_ACTIVITIES_STORAGE_KEY);
			if (!raw) {
				return false;
			}
			const parsed: unknown = JSON.parse(raw);
			if (typeof parsed !== 'object' || parsed === null) {
				return false;
			}
			const envelope = parsed as Record<string, unknown>;
			return (
				typeof envelope.version === 'number' && envelope.version > BREAK_ACTIVITIES_STORAGE_VERSION
			);
		} catch {
			return false;
		}
	}
}
