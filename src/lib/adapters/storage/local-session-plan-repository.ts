import type {
	PlanBlock,
	PlanBlockStatus,
	SessionPlan
} from '../../domain/planning/session-plan.entity';
import { validateSessionPlan } from '../../domain/planning/session-plan.entity';
import type { TimerConfig } from '../../domain/timer/timer-fsm';
import type { ISessionPlanRepository } from '../../domain/ports/session-plan-repository.port';

export const SESSION_PLAN_STORAGE_KEY = 'pomody:session-plan';
export const SESSION_PLAN_STORAGE_VERSION = 1;

export interface StoredSessionPlanEnvelope {
	readonly version: number;
	readonly plan: SessionPlan | null;
}

/**
 * Standard Web Storage API compliant in-memory storage fallback.
 * Used when localStorage is unavailable, restricted (SecurityError), or in SSR/Node contexts.
 */
export class InMemoryStorage implements Storage {
	private readonly items = new Map<string, string>();

	public get length(): number {
		return this.items.size;
	}

	public clear(): void {
		this.items.clear();
	}

	public getItem(key: string): string | null {
		return this.items.get(key) ?? null;
	}

	public key(index: number): string | null {
		return Array.from(this.items.keys())[index] ?? null;
	}

	public removeItem(key: string): void {
		this.items.delete(key);
	}

	public setItem(key: string, value: string): void {
		this.items.set(key, String(value));
	}
}

/**
 * Defensive validation for an individual PlanBlock item from raw storage.
 * Returns a frozen PlanBlock or null if corrupt.
 */
export function sanitizePlanBlock(raw: unknown): PlanBlock | null {
	if (typeof raw !== 'object' || raw === null) {
		return null;
	}

	const candidate = raw as Record<string, unknown>;

	if (
		typeof candidate.index !== 'number' ||
		!Number.isInteger(candidate.index) ||
		candidate.index < 0
	) {
		return null;
	}

	if (
		candidate.mode !== 'focus' &&
		candidate.mode !== 'shortBreak' &&
		candidate.mode !== 'longBreak'
	) {
		return null;
	}

	if (
		typeof candidate.durationSeconds !== 'number' ||
		!Number.isInteger(candidate.durationSeconds) ||
		candidate.durationSeconds <= 0
	) {
		return null;
	}

	const validStatuses: PlanBlockStatus[] = ['pending', 'in_progress', 'completed', 'skipped'];
	if (
		typeof candidate.status !== 'string' ||
		!validStatuses.includes(candidate.status as PlanBlockStatus)
	) {
		return null;
	}

	let assignedTaskId: string | undefined = undefined;
	if (candidate.assignedTaskId !== undefined && candidate.assignedTaskId !== null) {
		if (typeof candidate.assignedTaskId !== 'string') {
			return null;
		}
		const trimmedTaskId = candidate.assignedTaskId.trim();
		if (trimmedTaskId.length === 0) {
			return null;
		}
		assignedTaskId = trimmedTaskId;
	}

	let assignedBreakActivityId: string | undefined = undefined;
	if (
		candidate.assignedBreakActivityId !== undefined &&
		candidate.assignedBreakActivityId !== null
	) {
		if (typeof candidate.assignedBreakActivityId !== 'string') {
			return null;
		}
		const trimmedBreakId = candidate.assignedBreakActivityId.trim();
		if (trimmedBreakId.length === 0) {
			return null;
		}
		assignedBreakActivityId = trimmedBreakId;
	}

	const block: PlanBlock = {
		index: candidate.index,
		mode: candidate.mode,
		durationSeconds: candidate.durationSeconds,
		status: candidate.status as PlanBlockStatus,
		...(assignedTaskId !== undefined ? { assignedTaskId } : {}),
		...(assignedBreakActivityId !== undefined ? { assignedBreakActivityId } : {})
	};

	return Object.freeze(block);
}

/**
 * Defensive validation checking that raw input matches SessionPlan shape:
 * - id: non-empty string
 * - targetMode: 'blocks' | 'end_time'
 * - createdAt: finite number > 0
 * - freeMarginSeconds: finite number >= 0
 * - scheduledStartTimestamp: optional finite number
 * - targetEndTimestamp: optional finite number
 * - sessionConfig: valid TimerConfig
 * - blocks: array of sanitized PlanBlock
 *
 * Verifies all domain invariants via validateSessionPlan.
 * Returns a frozen SessionPlan or null if corrupt.
 */
export function sanitizeSessionPlan(raw: unknown): SessionPlan | null {
	if (typeof raw !== 'object' || raw === null) {
		return null;
	}

	const candidate = raw as Record<string, unknown>;

	if (typeof candidate.id !== 'string' || candidate.id.trim().length === 0) {
		return null;
	}

	if (candidate.targetMode !== 'blocks' && candidate.targetMode !== 'end_time') {
		return null;
	}

	if (
		typeof candidate.createdAt !== 'number' ||
		!Number.isFinite(candidate.createdAt) ||
		candidate.createdAt <= 0
	) {
		return null;
	}

	if (
		typeof candidate.freeMarginSeconds !== 'number' ||
		!Number.isFinite(candidate.freeMarginSeconds) ||
		candidate.freeMarginSeconds < 0
	) {
		return null;
	}

	let scheduledStartTimestamp: number | undefined = undefined;
	if (
		candidate.scheduledStartTimestamp !== undefined &&
		candidate.scheduledStartTimestamp !== null
	) {
		if (
			typeof candidate.scheduledStartTimestamp !== 'number' ||
			!Number.isFinite(candidate.scheduledStartTimestamp)
		) {
			return null;
		}
		scheduledStartTimestamp = candidate.scheduledStartTimestamp;
	}

	let targetEndTimestamp: number | undefined = undefined;
	if (candidate.targetEndTimestamp !== undefined && candidate.targetEndTimestamp !== null) {
		if (
			typeof candidate.targetEndTimestamp !== 'number' ||
			!Number.isFinite(candidate.targetEndTimestamp)
		) {
			return null;
		}
		targetEndTimestamp = candidate.targetEndTimestamp;
	}

	if (typeof candidate.sessionConfig !== 'object' || candidate.sessionConfig === null) {
		return null;
	}

	const cfg = candidate.sessionConfig as Record<string, unknown>;
	if (
		typeof cfg.focusDurationSeconds !== 'number' ||
		typeof cfg.shortBreakDurationSeconds !== 'number' ||
		typeof cfg.longBreakDurationSeconds !== 'number' ||
		typeof cfg.roundsBeforeLongBreak !== 'number'
	) {
		return null;
	}

	const sessionConfig: TimerConfig = {
		focusDurationSeconds: cfg.focusDurationSeconds,
		shortBreakDurationSeconds: cfg.shortBreakDurationSeconds,
		longBreakDurationSeconds: cfg.longBreakDurationSeconds,
		roundsBeforeLongBreak: cfg.roundsBeforeLongBreak
	};

	if (!Array.isArray(candidate.blocks)) {
		return null;
	}

	const blocks: PlanBlock[] = [];
	for (const rawBlock of candidate.blocks) {
		const sanitizedBlock = sanitizePlanBlock(rawBlock);
		if (!sanitizedBlock) {
			return null;
		}
		blocks.push(sanitizedBlock);
	}

	const plan: SessionPlan = {
		id: candidate.id.trim(),
		targetMode: candidate.targetMode,
		blocks: Object.freeze(blocks),
		sessionConfig: Object.freeze(sessionConfig),
		createdAt: candidate.createdAt,
		freeMarginSeconds: candidate.freeMarginSeconds,
		...(scheduledStartTimestamp !== undefined ? { scheduledStartTimestamp } : {}),
		...(targetEndTimestamp !== undefined ? { targetEndTimestamp } : {})
	};

	try {
		validateSessionPlan(plan);
	} catch {
		return null;
	}

	return Object.freeze(plan);
}

/**
 * Browser LocalStorage implementation of ISessionPlanRepository.
 * Persists the active session plan in a versioned envelope with defensive validation and self-healing.
 * Safe for use in SSR/Node and resilient against storage exceptions (e.g. QuotaExceededError, SecurityError).
 */
export class LocalStoragePlanRepository implements ISessionPlanRepository {
	private readonly injectedStorage?: Storage;
	private fallbackStorage?: Storage;

	constructor(storage?: Storage) {
		this.injectedStorage = storage;
	}

	/**
	 * Checks injected storage, then window.localStorage with try/catch for SSR and SecurityError.
	 * Falls back gracefully to an in-memory storage instance if window.localStorage is inaccessible.
	 */
	public getStorage(): Storage {
		if (this.injectedStorage !== undefined) {
			return this.injectedStorage;
		}

		if (typeof window !== 'undefined') {
			try {
				if (window.localStorage) {
					return window.localStorage;
				}
			} catch {
				// Window.localStorage access can throw SecurityError in restricted frames/contexts
			}
		}

		if (!this.fallbackStorage) {
			this.fallbackStorage = new InMemoryStorage();
		}

		return this.fallbackStorage;
	}

	/**
	 * Sanitization helper delegating to sanitizeSessionPlan.
	 */
	public sanitizeSessionPlan(raw: unknown): SessionPlan | null {
		return sanitizeSessionPlan(raw);
	}

	/**
	 * Reads and sanitizes the active session plan from storage.
	 * Returns null if missing, unsupported version, or corrupt.
	 */
	public async getActivePlan(): Promise<SessionPlan | null> {
		const storage = this.getStorage();

		let raw: string | null;
		try {
			raw = storage.getItem(SESSION_PLAN_STORAGE_KEY);
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
		if (envelope.version !== SESSION_PLAN_STORAGE_VERSION) {
			return null;
		}

		if (envelope.plan === null || envelope.plan === undefined) {
			return null;
		}

		return this.sanitizeSessionPlan(envelope.plan);
	}

	/**
	 * Validates the plan with validateSessionPlan and writes envelope JSON to storage.
	 * Handles quota exceeded and storage exceptions defensively.
	 */
	public async saveActivePlan(plan: SessionPlan): Promise<void> {
		validateSessionPlan(plan);

		const storage = this.getStorage();

		if (this.hasNewerVersionStored(storage)) {
			console.warn(
				`Storage contains a newer envelope version than supported (${SESSION_PLAN_STORAGE_VERSION}). Write aborted to prevent data loss.`
			);
			return;
		}

		const envelope: StoredSessionPlanEnvelope = {
			version: SESSION_PLAN_STORAGE_VERSION,
			plan
		};

		try {
			storage.setItem(SESSION_PLAN_STORAGE_KEY, JSON.stringify(envelope));
		} catch (err) {
			console.error('Failed to write session plan to storage:', err);
		}
	}

	/**
	 * Clears the active session plan from storage.
	 */
	public async clearActivePlan(): Promise<void> {
		const storage = this.getStorage();

		if (this.hasNewerVersionStored(storage)) {
			console.warn(
				`Storage contains a newer envelope version than supported (${SESSION_PLAN_STORAGE_VERSION}). Clear aborted to prevent data loss.`
			);
			return;
		}

		try {
			storage.removeItem(SESSION_PLAN_STORAGE_KEY);
		} catch (err) {
			console.error('Failed to clear session plan from storage:', err);
		}
	}

	/**
	 * Checks whether storage contains an envelope with a newer version than supported.
	 */
	private hasNewerVersionStored(storage: Storage): boolean {
		try {
			const raw = storage.getItem(SESSION_PLAN_STORAGE_KEY);
			if (!raw) {
				return false;
			}
			const parsed: unknown = JSON.parse(raw);
			if (typeof parsed !== 'object' || parsed === null) {
				return false;
			}
			const envelope = parsed as Record<string, unknown>;
			return (
				typeof envelope.version === 'number' && envelope.version > SESSION_PLAN_STORAGE_VERSION
			);
		} catch {
			return false;
		}
	}
}

export { LocalStoragePlanRepository as LocalStorageSessionPlanRepository };
