import type { TimerMode, TimerState } from './timer-fsm';

/**
 * Persisted execution record for the timer. Pure TypeScript: no DOM, Svelte or Tauri.
 *
 * `endsAt` is the absolute anchor used while `running`; `remainingMs` is the frozen
 * value used while `idle`, `paused` or `completed`. The record never stores both.
 */
export interface TimerSnapshotRecord {
	/** Owning session plan, or `null` for a free-running block without a session. */
	readonly planId: string | null;
	/** Plan block the FSM is executing, or `null` for a free-running block. */
	readonly blockIndex: number | null;
	readonly state: TimerState;
	readonly mode: TimerMode;
	readonly durationMs: number;
	readonly currentRound: number;
	readonly totalRoundsCompleted: number;
	/** Absolute timestamp at which the running block ends. */
	readonly endsAt?: number;
	/** Frozen remaining time for non-running states. */
	readonly remainingMs?: number;
	/** Timestamp of the write, used for diagnostics and clock-skew detection. */
	readonly savedAt: number;
}

/** Structural view of the active plan needed to validate and anchor a restore. */
export interface ActivePlanBlockView {
	readonly index: number;
	readonly mode: TimerMode;
	readonly durationSeconds: number;
	readonly status: 'pending' | 'in_progress' | 'completed' | 'skipped';
}

export interface ActivePlanView {
	readonly id: string;
	readonly activeBlockIndex: number;
	/** True when every plan block is completed or skipped: there is no block to execute. */
	readonly completed: boolean;
	readonly blocks: readonly ActivePlanBlockView[];
}

export type TimerRestoreDiscardReason =
	| 'missing-snapshot'
	| 'invalid-snapshot'
	| 'orphan-plan'
	| 'unbound-with-active-plan'
	| 'plan-mismatch'
	| 'expired'
	| 'clock-skew';

export interface RestoreAdoptDecision {
	readonly kind: 'adopt';
	readonly planId: string | null;
	readonly blockIndex: number | null;
	readonly state: TimerState;
	readonly mode: TimerMode;
	readonly durationMs: number;
	readonly remainingMs: number;
	readonly currentRound: number;
	readonly totalRoundsCompleted: number;
}

/** Idle timer anchored to the plan's active block after a discard. */
export interface RestoreAnchorDecision {
	readonly kind: 'anchor';
	readonly planId: string;
	readonly blockIndex: number;
	readonly mode: TimerMode;
	readonly durationMs: number;
	readonly currentRound: number;
	readonly totalRoundsCompleted: number;
	readonly reason: TimerRestoreDiscardReason;
}

export interface RestoreFreshDecision {
	readonly kind: 'fresh';
	readonly reason?: TimerRestoreDiscardReason;
}

export type TimerRestoreDecision =
	RestoreAdoptDecision | RestoreAnchorDecision | RestoreFreshDecision;

const VALID_STATES: readonly TimerState[] = ['idle', 'running', 'paused', 'completed'];
const VALID_MODES: readonly TimerMode[] = ['focus', 'shortBreak', 'longBreak'];

function isNonEmptyString(value: unknown): value is string {
	return typeof value === 'string' && value.trim().length > 0;
}

function isFiniteNumber(value: unknown): value is number {
	return typeof value === 'number' && Number.isFinite(value);
}

function isNonNegativeInteger(value: unknown): value is number {
	return (
		typeof value === 'number' && Number.isFinite(value) && Number.isInteger(value) && value >= 0
	);
}

/**
 * Defensive validation of a timer snapshot read from storage.
 * Returns a frozen record, or `null` when any invariant is violated.
 */
export function sanitizeTimerSnapshot(raw: unknown): TimerSnapshotRecord | null {
	if (typeof raw !== 'object' || raw === null) {
		return null;
	}

	const candidate = raw as Record<string, unknown>;

	if (candidate.planId === null) {
		if (candidate.blockIndex !== null) {
			return null;
		}
	} else if (isNonEmptyString(candidate.planId)) {
		if (!isNonNegativeInteger(candidate.blockIndex)) {
			return null;
		}
	} else {
		return null;
	}

	const planId = candidate.planId === null ? null : (candidate.planId as string).trim();
	const blockIndex = candidate.blockIndex === null ? null : (candidate.blockIndex as number);

	if (
		typeof candidate.state !== 'string' ||
		!VALID_STATES.includes(candidate.state as TimerState)
	) {
		return null;
	}
	const state = candidate.state as TimerState;

	if (typeof candidate.mode !== 'string' || !VALID_MODES.includes(candidate.mode as TimerMode)) {
		return null;
	}
	const mode = candidate.mode as TimerMode;

	if (!isNonNegativeInteger(candidate.durationMs) || candidate.durationMs <= 0) {
		return null;
	}
	const durationMs = candidate.durationMs;

	if (!isNonNegativeInteger(candidate.currentRound) || candidate.currentRound < 1) {
		return null;
	}
	const currentRound = candidate.currentRound;

	if (!isNonNegativeInteger(candidate.totalRoundsCompleted)) {
		return null;
	}
	const totalRoundsCompleted = candidate.totalRoundsCompleted;

	if (!isFiniteNumber(candidate.savedAt) || candidate.savedAt <= 0) {
		return null;
	}
	const savedAt = candidate.savedAt;

	if (state === 'running') {
		if (!isFiniteNumber(candidate.endsAt)) {
			return null;
		}
		return Object.freeze({
			planId,
			blockIndex,
			state,
			mode,
			durationMs,
			currentRound,
			totalRoundsCompleted,
			endsAt: candidate.endsAt,
			savedAt
		});
	}

	const remainingMs = candidate.remainingMs;
	if (!isFiniteNumber(remainingMs) || remainingMs < 0 || remainingMs > durationMs) {
		return null;
	}
	if (state === 'completed' && remainingMs !== 0) {
		return null;
	}
	if (state === 'idle' && remainingMs !== durationMs) {
		return null;
	}

	return Object.freeze({
		planId,
		blockIndex,
		state,
		mode,
		durationMs,
		currentRound,
		totalRoundsCompleted,
		remainingMs,
		savedAt
	});
}

function findActiveBlock(plan: ActivePlanView): ActivePlanBlockView | null {
	return plan.blocks.find((block) => block.index === plan.activeBlockIndex) ?? null;
}

/**
 * Derives the FSM round counters from the plan position.
 * Breaks keep the round of the focus block they follow, matching `calculateNextCycleStep`.
 */
function deriveRounds(
	plan: ActivePlanView,
	activeBlock: ActivePlanBlockView
): { currentRound: number; totalRoundsCompleted: number } {
	const focusBlocks = plan.blocks.filter((block) => block.mode === 'focus');
	const focusUpToActive = focusBlocks.filter((block) => block.index <= activeBlock.index).length;
	const totalRoundsCompleted = focusBlocks.filter((block) => block.status === 'completed').length;

	return {
		currentRound: Math.max(1, focusUpToActive),
		totalRoundsCompleted
	};
}

function anchorToActiveBlock(
	plan: ActivePlanView,
	reason: TimerRestoreDiscardReason
): TimerRestoreDecision {
	const activeBlock = findActiveBlock(plan);
	if (!activeBlock) {
		return { kind: 'fresh', reason };
	}

	const { currentRound, totalRoundsCompleted } = deriveRounds(plan, activeBlock);

	return {
		kind: 'anchor',
		planId: plan.id,
		blockIndex: activeBlock.index,
		mode: activeBlock.mode,
		durationMs: activeBlock.durationSeconds * 1000,
		currentRound,
		totalRoundsCompleted,
		reason
	};
}

function adoptRecord(snapshot: TimerSnapshotRecord, remainingMs: number): RestoreAdoptDecision {
	return {
		kind: 'adopt',
		planId: snapshot.planId,
		blockIndex: snapshot.blockIndex,
		state: snapshot.state,
		mode: snapshot.mode,
		durationMs: snapshot.durationMs,
		remainingMs,
		currentRound: snapshot.currentRound,
		totalRoundsCompleted: snapshot.totalRoundsCompleted
	};
}

export interface ResolveTimerRestoreParams {
	readonly persisted: TimerSnapshotRecord | null;
	readonly plan: ActivePlanView | null;
	readonly now: number;
}

/**
 * Decides how the FSM must adopt the persisted state.
 *
 * - `adopt`: the snapshot is consistent; apply it as-is.
 * - `anchor`: the snapshot was discarded but a session is active; start the active block clean.
 * - `fresh`: nothing to restore; leave the FSM at its constructed defaults.
 */
export function resolveTimerRestore({
	persisted,
	plan,
	now
}: ResolveTimerRestoreParams): TimerRestoreDecision {
	if (!persisted) {
		return plan ? anchorToActiveBlock(plan, 'missing-snapshot') : { kind: 'fresh' };
	}

	if (plan?.completed) {
		if (persisted.planId === plan.id && persisted.state === 'completed') {
			return adoptRecord(persisted, 0);
		}
		return { kind: 'fresh', reason: 'plan-mismatch' };
	}

	if (persisted.planId === null) {
		if (plan) {
			return anchorToActiveBlock(plan, 'unbound-with-active-plan');
		}
		if (persisted.state === 'running') {
			const remainingMs = (persisted.endsAt ?? 0) - now;
			if (remainingMs <= 0) {
				return { kind: 'fresh', reason: 'expired' };
			}
			if (remainingMs > persisted.durationMs) {
				return { kind: 'fresh', reason: 'clock-skew' };
			}
			return adoptRecord(persisted, remainingMs);
		}
		return adoptRecord(persisted, persisted.remainingMs ?? 0);
	}

	if (!plan) {
		return { kind: 'fresh', reason: 'orphan-plan' };
	}

	if (plan.id !== persisted.planId) {
		return anchorToActiveBlock(plan, 'plan-mismatch');
	}

	const expectedIndex =
		persisted.state === 'completed' ? plan.activeBlockIndex - 1 : plan.activeBlockIndex;

	if (persisted.blockIndex !== expectedIndex) {
		return anchorToActiveBlock(plan, 'plan-mismatch');
	}

	const expectedBlock = plan.blocks.find((block) => block.index === expectedIndex);
	if (
		!expectedBlock ||
		expectedBlock.mode !== persisted.mode ||
		expectedBlock.durationSeconds * 1000 !== persisted.durationMs
	) {
		return anchorToActiveBlock(plan, 'plan-mismatch');
	}

	if (persisted.state === 'running') {
		const remainingMs = (persisted.endsAt ?? 0) - now;
		if (remainingMs <= 0) {
			return anchorToActiveBlock(plan, 'expired');
		}
		if (remainingMs > persisted.durationMs) {
			return anchorToActiveBlock(plan, 'clock-skew');
		}
		return adoptRecord(persisted, remainingMs);
	}

	return adoptRecord(persisted, persisted.remainingMs ?? 0);
}

/**
 * Builds the record to persist from an FSM snapshot and the plan block it belongs to.
 * The caller supplies `blockIndex`: a completed FSM still belongs to the block the plan
 * already advanced past, so the index cannot be derived from the active block alone.
 */
export interface BuildTimerSnapshotParams {
	readonly state: TimerState;
	readonly mode: TimerMode;
	readonly durationMs: number;
	readonly remainingMs: number;
	readonly currentRound: number;
	readonly totalRoundsCompleted: number;
	readonly planId: string | null;
	readonly blockIndex: number | null;
	readonly now: number;
}

export function buildTimerSnapshotRecord({
	state,
	mode,
	durationMs,
	remainingMs,
	currentRound,
	totalRoundsCompleted,
	planId,
	blockIndex,
	now
}: BuildTimerSnapshotParams): TimerSnapshotRecord {
	const bound = planId !== null && blockIndex !== null;
	const base = {
		planId: bound ? planId : null,
		blockIndex: bound ? blockIndex : null,
		state,
		mode,
		durationMs,
		currentRound,
		totalRoundsCompleted,
		savedAt: now
	};

	if (state === 'running') {
		return Object.freeze({ ...base, endsAt: now + remainingMs });
	}

	return Object.freeze({
		...base,
		remainingMs: state === 'completed' ? 0 : remainingMs
	});
}
