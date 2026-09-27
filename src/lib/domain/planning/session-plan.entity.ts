import { type TimerConfig, validateTimerConfig } from '../timer/timer-fsm';

export type PlanTargetMode = 'blocks' | 'end_time';

export type PlanBlockStatus = 'pending' | 'in_progress' | 'completed' | 'skipped';

export interface PlanBlock {
	readonly index: number;
	readonly mode: 'focus' | 'shortBreak' | 'longBreak';
	readonly durationSeconds: number;
	readonly assignedTaskId?: string;
	readonly assignedBreakActivityId?: string;
	readonly status: PlanBlockStatus;
}

export interface SessionPlan {
	readonly id: string;
	readonly targetMode: PlanTargetMode;
	readonly blocks: readonly PlanBlock[];
	readonly sessionConfig: TimerConfig;
	readonly createdAt: number;
	readonly scheduledStartTimestamp?: number;
	readonly targetEndTimestamp?: number;
	readonly freeMarginSeconds: number;
}

export class InvalidSessionPlanError extends Error {
	constructor(message: string) {
		super(message);
		this.name = 'InvalidSessionPlanError';
	}
}

export class PlanBlockNotFoundError extends Error {
	constructor(message: string) {
		super(message);
		this.name = 'PlanBlockNotFoundError';
	}
}

export class InvalidPlanOperationError extends Error {
	constructor(message: string) {
		super(message);
		this.name = 'InvalidPlanOperationError';
	}
}

/**
 * Generates an RFC 4122 v4 UUID for session plans.
 */
export function generatePlanId(): string {
	if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
		return crypto.randomUUID();
	}

	return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
		const r = (Math.random() * 16) | 0;
		const v = c === 'x' ? r : (r & 0x3) | 0x8;
		return v.toString(16);
	});
}

export interface CalculateSessionBudgetByBlocksParams {
	readonly blockCount: number;
	readonly sessionConfig: TimerConfig;
	readonly scheduledStartTimestamp?: number;
	readonly id?: string;
	readonly createdAt?: number;
}

/**
 * Calculates a session plan given a fixed count of focus blocks.
 * Alternates focus and break blocks, triggering a long break after every
 * `sessionConfig.roundsBeforeLongBreak` focus rounds.
 * Strictly terminates at the final focus block (no trailing break).
 */
export function calculateSessionBudgetByBlocks(
	params: CalculateSessionBudgetByBlocksParams
): SessionPlan {
	const { blockCount, sessionConfig, scheduledStartTimestamp, id, createdAt } = params;

	if (
		typeof blockCount !== 'number' ||
		!Number.isFinite(blockCount) ||
		!Number.isInteger(blockCount) ||
		blockCount < 1
	) {
		throw new InvalidSessionPlanError('blockCount must be an integer greater than or equal to 1');
	}

	validateTimerConfig(sessionConfig);

	if (
		scheduledStartTimestamp !== undefined &&
		(typeof scheduledStartTimestamp !== 'number' || !Number.isFinite(scheduledStartTimestamp))
	) {
		throw new InvalidSessionPlanError(
			'scheduledStartTimestamp must be a finite number when provided'
		);
	}

	const blocks: PlanBlock[] = [];

	for (let i = 0; i < blockCount; i++) {
		const focusRound = i + 1;

		blocks.push(
			Object.freeze({
				index: blocks.length,
				mode: 'focus',
				durationSeconds: sessionConfig.focusDurationSeconds,
				status: 'pending'
			})
		);

		if (i < blockCount - 1) {
			const isLongBreak = focusRound % sessionConfig.roundsBeforeLongBreak === 0;
			const breakDuration = isLongBreak
				? sessionConfig.longBreakDurationSeconds
				: sessionConfig.shortBreakDurationSeconds;

			blocks.push(
				Object.freeze({
					index: blocks.length,
					mode: isLongBreak ? 'longBreak' : 'shortBreak',
					durationSeconds: breakDuration,
					status: 'pending'
				})
			);
		}
	}

	let targetEndTimestamp: number | undefined;
	if (scheduledStartTimestamp !== undefined) {
		const totalDurationSeconds = blocks.reduce((acc, b) => acc + b.durationSeconds, 0);
		targetEndTimestamp = scheduledStartTimestamp + totalDurationSeconds * 1000;
	}

	const plan: SessionPlan = Object.freeze({
		id: id ?? generatePlanId(),
		targetMode: 'blocks',
		blocks: Object.freeze(blocks),
		sessionConfig: Object.freeze({ ...sessionConfig }),
		createdAt: createdAt ?? Date.now(),
		scheduledStartTimestamp,
		targetEndTimestamp,
		freeMarginSeconds: 0
	});

	validateSessionPlan(plan);
	return plan;
}

export interface CalculateSessionBudgetByEndTimeParams {
	readonly scheduledStartTimestamp: number;
	readonly targetEndTimestamp: number;
	readonly sessionConfig: TimerConfig;
	readonly id?: string;
	readonly createdAt?: number;
}

/**
 * Calculates a session plan packing as many focus/break cycles as fit within the time window.
 * W = Math.floor((targetEndTimestamp - scheduledStartTimestamp) / 1000) seconds.
 * If W < focusDurationSeconds, returns empty blocks.
 * Sequence strictly ends on the last full focus block.
 */
export function calculateSessionBudgetByEndTime(
	params: CalculateSessionBudgetByEndTimeParams
): SessionPlan {
	const { scheduledStartTimestamp, targetEndTimestamp, sessionConfig, id, createdAt } = params;

	if (
		typeof scheduledStartTimestamp !== 'number' ||
		!Number.isFinite(scheduledStartTimestamp) ||
		typeof targetEndTimestamp !== 'number' ||
		!Number.isFinite(targetEndTimestamp)
	) {
		throw new InvalidSessionPlanError(
			'scheduledStartTimestamp and targetEndTimestamp must be finite numbers'
		);
	}

	validateTimerConfig(sessionConfig);

	const windowSeconds = Math.floor((targetEndTimestamp - scheduledStartTimestamp) / 1000);

	if (windowSeconds < sessionConfig.focusDurationSeconds) {
		const underflowPlan: SessionPlan = Object.freeze({
			id: id ?? generatePlanId(),
			targetMode: 'end_time',
			blocks: Object.freeze([]),
			sessionConfig: Object.freeze({ ...sessionConfig }),
			createdAt: createdAt ?? Date.now(),
			scheduledStartTimestamp,
			targetEndTimestamp,
			freeMarginSeconds: Math.max(0, windowSeconds)
		});

		validateSessionPlan(underflowPlan);
		return underflowPlan;
	}

	const blocks: PlanBlock[] = [];
	let allocatedSeconds = 0;
	let focusRound = 1;

	// Always starts with Focus Block 1
	blocks.push(
		Object.freeze({
			index: blocks.length,
			mode: 'focus',
			durationSeconds: sessionConfig.focusDurationSeconds,
			status: 'pending'
		})
	);
	allocatedSeconds += sessionConfig.focusDurationSeconds;

	// Next focus block is only added if (breakDuration + focusDuration) fits in remaining window
	while (true) {
		const isLongBreak = focusRound % sessionConfig.roundsBeforeLongBreak === 0;
		const breakDuration = isLongBreak
			? sessionConfig.longBreakDurationSeconds
			: sessionConfig.shortBreakDurationSeconds;
		const cycleCost = breakDuration + sessionConfig.focusDurationSeconds;

		if (allocatedSeconds + cycleCost <= windowSeconds) {
			blocks.push(
				Object.freeze({
					index: blocks.length,
					mode: isLongBreak ? 'longBreak' : 'shortBreak',
					durationSeconds: breakDuration,
					status: 'pending'
				})
			);
			blocks.push(
				Object.freeze({
					index: blocks.length,
					mode: 'focus',
					durationSeconds: sessionConfig.focusDurationSeconds,
					status: 'pending'
				})
			);
			allocatedSeconds += cycleCost;
			focusRound++;
		} else {
			break;
		}
	}

	const plan: SessionPlan = Object.freeze({
		id: id ?? generatePlanId(),
		targetMode: 'end_time',
		blocks: Object.freeze(blocks),
		sessionConfig: Object.freeze({ ...sessionConfig }),
		createdAt: createdAt ?? Date.now(),
		scheduledStartTimestamp,
		targetEndTimestamp,
		freeMarginSeconds: windowSeconds - allocatedSeconds
	});

	validateSessionPlan(plan);
	return plan;
}

/**
 * Immutably assigns a task ID to a focus block.
 */
export function assignTaskToBlock(
	plan: SessionPlan,
	blockIndex: number,
	taskId: string
): SessionPlan {
	validateSessionPlan(plan);

	if (typeof taskId !== 'string' || taskId.trim().length === 0) {
		throw new InvalidPlanOperationError('taskId must be a non-empty string');
	}

	if (
		typeof blockIndex !== 'number' ||
		!Number.isInteger(blockIndex) ||
		blockIndex < 0 ||
		blockIndex >= plan.blocks.length
	) {
		throw new PlanBlockNotFoundError(`Plan block at index ${blockIndex} not found`);
	}

	const targetBlock = plan.blocks[blockIndex];
	if (targetBlock.mode !== 'focus') {
		throw new InvalidPlanOperationError(
			`Cannot assign task to a non-focus block (${targetBlock.mode})`
		);
	}

	const newBlocks = plan.blocks.map((block, idx) => {
		if (idx === blockIndex) {
			return Object.freeze({
				...block,
				assignedTaskId: taskId.trim()
			});
		}
		return block;
	});

	const updatedPlan: SessionPlan = Object.freeze({
		...plan,
		blocks: Object.freeze(newBlocks)
	});

	validateSessionPlan(updatedPlan);
	return updatedPlan;
}

/**
 * Immutably removes assigned task from a block.
 */
export function unassignTaskFromBlock(plan: SessionPlan, blockIndex: number): SessionPlan {
	validateSessionPlan(plan);

	if (
		typeof blockIndex !== 'number' ||
		!Number.isInteger(blockIndex) ||
		blockIndex < 0 ||
		blockIndex >= plan.blocks.length
	) {
		throw new PlanBlockNotFoundError(`Plan block at index ${blockIndex} not found`);
	}

	const newBlocks = plan.blocks.map((block, idx) => {
		if (idx === blockIndex) {
			const newBlock: PlanBlock = {
				index: block.index,
				mode: block.mode,
				durationSeconds: block.durationSeconds,
				status: block.status,
				...(block.assignedBreakActivityId !== undefined
					? { assignedBreakActivityId: block.assignedBreakActivityId }
					: {})
			};
			return Object.freeze(newBlock);
		}
		return block;
	});

	const updatedPlan: SessionPlan = Object.freeze({
		...plan,
		blocks: Object.freeze(newBlocks)
	});

	validateSessionPlan(updatedPlan);
	return updatedPlan;
}

/**
 * Immutably assigns a break activity ID to a break block.
 */
export function assignBreakActivityToBlock(
	plan: SessionPlan,
	blockIndex: number,
	activityId: string
): SessionPlan {
	validateSessionPlan(plan);

	if (typeof activityId !== 'string' || activityId.trim().length === 0) {
		throw new InvalidPlanOperationError('activityId must be a non-empty string');
	}

	if (
		typeof blockIndex !== 'number' ||
		!Number.isInteger(blockIndex) ||
		blockIndex < 0 ||
		blockIndex >= plan.blocks.length
	) {
		throw new PlanBlockNotFoundError(`Plan block at index ${blockIndex} not found`);
	}

	const targetBlock = plan.blocks[blockIndex];
	if (targetBlock.mode === 'focus') {
		throw new InvalidPlanOperationError('Cannot assign a break activity to a focus block');
	}

	const newBlocks = plan.blocks.map((block, idx) => {
		if (idx === blockIndex) {
			return Object.freeze({
				...block,
				assignedBreakActivityId: activityId.trim()
			});
		}
		return block;
	});

	const updatedPlan: SessionPlan = Object.freeze({
		...plan,
		blocks: Object.freeze(newBlocks)
	});

	validateSessionPlan(updatedPlan);
	return updatedPlan;
}

/**
 * Immutably unassigns break activity from a block.
 */
export function unassignBreakActivityFromBlock(plan: SessionPlan, blockIndex: number): SessionPlan {
	validateSessionPlan(plan);

	if (
		typeof blockIndex !== 'number' ||
		!Number.isInteger(blockIndex) ||
		blockIndex < 0 ||
		blockIndex >= plan.blocks.length
	) {
		throw new PlanBlockNotFoundError(`Plan block at index ${blockIndex} not found`);
	}

	const newBlocks = plan.blocks.map((block, idx) => {
		if (idx === blockIndex) {
			const newBlock: PlanBlock = {
				index: block.index,
				mode: block.mode,
				durationSeconds: block.durationSeconds,
				status: block.status,
				...(block.assignedTaskId !== undefined ? { assignedTaskId: block.assignedTaskId } : {})
			};
			return Object.freeze(newBlock);
		}
		return block;
	});

	const updatedPlan: SessionPlan = Object.freeze({
		...plan,
		blocks: Object.freeze(newBlocks)
	});

	validateSessionPlan(updatedPlan);
	return updatedPlan;
}

/**
 * Immutably updates the status of a block.
 */
export function updateBlockStatus(
	plan: SessionPlan,
	blockIndex: number,
	status: PlanBlockStatus
): SessionPlan {
	validateSessionPlan(plan);

	const validStatuses: PlanBlockStatus[] = ['pending', 'in_progress', 'completed', 'skipped'];
	if (!validStatuses.includes(status)) {
		throw new InvalidPlanOperationError(`Invalid block status: ${status}`);
	}

	if (
		typeof blockIndex !== 'number' ||
		!Number.isInteger(blockIndex) ||
		blockIndex < 0 ||
		blockIndex >= plan.blocks.length
	) {
		throw new PlanBlockNotFoundError(`Plan block at index ${blockIndex} not found`);
	}

	const newBlocks = plan.blocks.map((block, idx) => {
		if (idx === blockIndex) {
			return Object.freeze({
				...block,
				status
			});
		}
		return block;
	});

	const updatedPlan: SessionPlan = Object.freeze({
		...plan,
		blocks: Object.freeze(newBlocks)
	});

	validateSessionPlan(updatedPlan);
	return updatedPlan;
}

/**
 * Asserts structural and logical integrity of a SessionPlan entity.
 * Throws InvalidSessionPlanError if any invariants are violated.
 */
export function validateSessionPlan(plan: SessionPlan): void {
	if (!plan || typeof plan !== 'object') {
		throw new InvalidSessionPlanError('Session plan must be a non-null object');
	}

	if (typeof plan.id !== 'string' || plan.id.trim().length === 0) {
		throw new InvalidSessionPlanError('Session plan id must be a non-empty string');
	}

	if (plan.targetMode !== 'blocks' && plan.targetMode !== 'end_time') {
		throw new InvalidSessionPlanError('targetMode must be either "blocks" or "end_time"');
	}

	validateTimerConfig(plan.sessionConfig);

	if (
		typeof plan.createdAt !== 'number' ||
		!Number.isFinite(plan.createdAt) ||
		plan.createdAt <= 0
	) {
		throw new InvalidSessionPlanError('createdAt must be a positive finite timestamp');
	}

	if (
		typeof plan.freeMarginSeconds !== 'number' ||
		!Number.isFinite(plan.freeMarginSeconds) ||
		plan.freeMarginSeconds < 0
	) {
		throw new InvalidSessionPlanError('freeMarginSeconds must be a non-negative finite number');
	}

	if (
		plan.scheduledStartTimestamp !== undefined &&
		(typeof plan.scheduledStartTimestamp !== 'number' ||
			!Number.isFinite(plan.scheduledStartTimestamp))
	) {
		throw new InvalidSessionPlanError(
			'scheduledStartTimestamp must be a finite number when defined'
		);
	}

	if (
		plan.targetEndTimestamp !== undefined &&
		(typeof plan.targetEndTimestamp !== 'number' || !Number.isFinite(plan.targetEndTimestamp))
	) {
		throw new InvalidSessionPlanError('targetEndTimestamp must be a finite number when defined');
	}

	if (
		plan.scheduledStartTimestamp !== undefined &&
		plan.targetEndTimestamp !== undefined &&
		plan.targetEndTimestamp < plan.scheduledStartTimestamp
	) {
		throw new InvalidSessionPlanError(
			'targetEndTimestamp cannot be before scheduledStartTimestamp'
		);
	}

	if (!Array.isArray(plan.blocks)) {
		throw new InvalidSessionPlanError('blocks must be an array');
	}

	const validStatuses: PlanBlockStatus[] = ['pending', 'in_progress', 'completed', 'skipped'];

	for (let i = 0; i < plan.blocks.length; i++) {
		const block = plan.blocks[i];

		if (!block || typeof block !== 'object') {
			throw new InvalidSessionPlanError(`Block at index ${i} must be a non-null object`);
		}

		if (block.index !== i) {
			throw new InvalidSessionPlanError(
				`Block index mismatch: expected ${i}, found ${block.index}`
			);
		}

		if (block.mode !== 'focus' && block.mode !== 'shortBreak' && block.mode !== 'longBreak') {
			throw new InvalidSessionPlanError(`Invalid mode "${block.mode}" at block index ${i}`);
		}

		if (
			typeof block.durationSeconds !== 'number' ||
			!Number.isFinite(block.durationSeconds) ||
			!Number.isInteger(block.durationSeconds) ||
			block.durationSeconds <= 0
		) {
			throw new InvalidSessionPlanError(
				`durationSeconds at block index ${i} must be a positive integer`
			);
		}

		if (!validStatuses.includes(block.status)) {
			throw new InvalidSessionPlanError(`Invalid status "${block.status}" at block index ${i}`);
		}

		if (block.mode === 'focus') {
			if (block.assignedBreakActivityId !== undefined) {
				throw new InvalidSessionPlanError(
					`Focus block at index ${i} cannot have assignedBreakActivityId`
				);
			}
			if (
				block.assignedTaskId !== undefined &&
				(typeof block.assignedTaskId !== 'string' || block.assignedTaskId.trim().length === 0)
			) {
				throw new InvalidSessionPlanError(
					`assignedTaskId at block index ${i} must be a non-empty string when defined`
				);
			}
		} else {
			if (block.assignedTaskId !== undefined) {
				throw new InvalidSessionPlanError(`Break block at index ${i} cannot have assignedTaskId`);
			}
			if (
				block.assignedBreakActivityId !== undefined &&
				(typeof block.assignedBreakActivityId !== 'string' ||
					block.assignedBreakActivityId.trim().length === 0)
			) {
				throw new InvalidSessionPlanError(
					`assignedBreakActivityId at block index ${i} must be a non-empty string when defined`
				);
			}
		}

		// Alternation invariant
		if (i > 0) {
			const prevBlock = plan.blocks[i - 1];
			const wasPrevFocus = prevBlock.mode === 'focus';
			const isCurrentFocus = block.mode === 'focus';

			if (wasPrevFocus === isCurrentFocus) {
				throw new InvalidSessionPlanError(
					`Blocks must alternate between focus and break: violation between index ${i - 1} and ${i}`
				);
			}
		}
	}

	// Sequence must start and strictly terminate at a focus block if non-empty
	if (plan.blocks.length > 0) {
		if (plan.blocks[0].mode !== 'focus') {
			throw new InvalidSessionPlanError('First block of a session plan must be a focus block');
		}

		if (plan.blocks[plan.blocks.length - 1].mode !== 'focus') {
			throw new InvalidSessionPlanError(
				'Session plan sequence must strictly terminate at a focus block'
			);
		}
	}
}
