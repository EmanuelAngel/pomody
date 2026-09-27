import { SvelteDate, SvelteMap } from 'svelte/reactivity';
import type {
	PlanTargetMode,
	PlanBlock,
	SessionPlan
} from '../domain/planning/session-plan.entity';
import {
	calculateSessionBudgetByBlocks,
	calculateSessionBudgetByEndTime,
	assignTaskToBlock,
	unassignTaskFromBlock,
	updateBlockStatus,
	validateSessionPlan
} from '../domain/planning/session-plan.entity';
import type { TimerConfig, TimerMode } from '../domain/timer/timer-fsm';
import { validateTimerConfig } from '../domain/timer/timer-fsm';
import type { ISessionPlanRepository } from '../domain/ports/session-plan-repository.port';
import { LocalStoragePlanRepository } from '../adapters/storage/local-session-plan-repository';
import { TimerState, timerState as defaultTimerState } from './timer.svelte';
import { TasksState, tasksState as defaultTasksState } from './tasks.svelte';

export interface PlanningStateDependencies {
	repository?: ISessionPlanRepository;
	timerState?: TimerState;
	tasksState?: TasksState;
}

/**
 * Computes default target end time string (2 hours from now) formatted as HH:mm.
 */
function getDefaultTargetEndTime(now = new SvelteDate()): string {
	const target = new SvelteDate(now.getTime() + 2 * 60 * 60 * 1000);
	const hours = String(target.getHours()).padStart(2, '0');
	const minutes = String(target.getMinutes()).padStart(2, '0');
	return `${hours}:${minutes}`;
}

/**
 * Parses an HH:mm string into a timestamp for the base date.
 */
function parseTimeToTimestamp(timeStr: string, baseDate = new SvelteDate()): number {
	const trimmed = timeStr.trim();
	const parts = trimmed.split(':');
	let hours = parseInt(parts[0], 10);
	let minutes = parseInt(parts[1], 10);
	if (!Number.isFinite(hours) || hours < 0 || hours > 23) {
		hours = 0;
	}
	if (!Number.isFinite(minutes) || minutes < 0 || minutes > 59) {
		minutes = 0;
	}
	const d = new SvelteDate(baseDate.getTime());
	d.setHours(hours, minutes, 0, 0);
	return d.getTime();
}

/**
 * Reactive state store managing Session Planning and Timer Lifecycle orchestration
 * with Svelte 5 Runes ($state, $derived).
 */
export class PlanningState {
	private readonly repository: ISessionPlanRepository;
	private readonly timerState?: TimerState;
	private readonly tasksState?: TasksState;

	private _targetMode = $state<PlanTargetMode>('blocks');
	private _blockCount = $state<number>(4);
	private _focusMinutes = $state<number>(25);
	private _shortBreakMinutes = $state<number>(5);
	private _longBreakMinutes = $state<number>(15);
	private _longBreakInterval = $state<number>(4);
	private _targetEndTime = $state<string>(getDefaultTargetEndTime());
	private _scheduledStartTime = $state<string>('now');
	private _draftTaskAssignments = $state<Map<number, string>>(new SvelteMap());
	private _activePlan = $state<SessionPlan | null>(null);
	private _isLoading = $state<boolean>(false);
	private _isLoaded = $state<boolean>(false);
	private _activeBlockIndex = $state<number>(0);

	public readonly targetMode = $derived.by<PlanTargetMode>(() => this._targetMode);
	public readonly blockCount = $derived.by<number>(() => this._blockCount);
	public readonly focusMinutes = $derived.by<number>(() => this._focusMinutes);
	public readonly shortBreakMinutes = $derived.by<number>(() => this._shortBreakMinutes);
	public readonly longBreakMinutes = $derived.by<number>(() => this._longBreakMinutes);
	public readonly longBreakInterval = $derived.by<number>(() => this._longBreakInterval);
	public readonly targetEndTime = $derived.by<string>(() => this._targetEndTime);
	public readonly scheduledStartTime = $derived.by<string>(() => this._scheduledStartTime);
	public readonly draftTaskAssignments = $derived.by<ReadonlyMap<number, string>>(
		() => this._draftTaskAssignments
	);
	public readonly isLoading = $derived.by<boolean>(() => this._isLoading);
	public readonly isLoaded = $derived.by<boolean>(() => this._isLoaded);

	public readonly activePlan = $derived.by<SessionPlan | null>(() => this._activePlan);

	public readonly isPlanCompleted = $derived.by<boolean>(() => {
		if (this._activePlan === null || this._activePlan.blocks.length === 0) {
			return false;
		}
		return this._activePlan.blocks.every((b) => b.status === 'completed');
	});

	public readonly isSessionActive = $derived.by<boolean>(() => {
		return this._activePlan !== null && !this.isPlanCompleted;
	});

	public readonly activeBlockIndex = $derived.by<number>(() => this._activeBlockIndex);

	public readonly activeBlock = $derived.by<PlanBlock | null>(() => {
		if (this._activePlan === null || this._activePlan.blocks.length === 0) {
			return null;
		}
		return this._activePlan.blocks[this._activeBlockIndex] ?? null;
	});

	public readonly currentSessionConfig = $derived.by<TimerConfig>(() => ({
		focusDurationSeconds: this._focusMinutes * 60,
		shortBreakDurationSeconds: this._shortBreakMinutes * 60,
		longBreakDurationSeconds: this._longBreakMinutes * 60,
		roundsBeforeLongBreak: this._longBreakInterval
	}));

	public readonly projectedPlan = $derived.by<SessionPlan>(() => {
		if (this._activePlan !== null) {
			return this._activePlan;
		}
		return this.buildPlanFromDraft();
	});

	public readonly totalFocusMinutes = $derived.by<number>(() => {
		const plan = this.projectedPlan;
		const focusSeconds = plan.blocks
			.filter((b) => b.mode === 'focus')
			.reduce((acc, b) => acc + b.durationSeconds, 0);
		return Math.round(focusSeconds / 60);
	});

	public readonly totalBreakMinutes = $derived.by<number>(() => {
		const plan = this.projectedPlan;
		const breakSeconds = plan.blocks
			.filter((b) => b.mode !== 'focus')
			.reduce((acc, b) => acc + b.durationSeconds, 0);
		return Math.round(breakSeconds / 60);
	});

	public readonly estimatedFinishTime = $derived.by<string>(() => {
		const plan = this.projectedPlan;
		const endMs =
			plan.targetEndTimestamp ??
			(plan.scheduledStartTimestamp ?? Date.now()) +
				plan.blocks.reduce((acc, b) => acc + b.durationSeconds, 0) * 1000 +
				plan.freeMarginSeconds * 1000;

		const d = new SvelteDate(endMs);
		const hours = String(d.getHours()).padStart(2, '0');
		const minutes = String(d.getMinutes()).padStart(2, '0');
		return `${hours}:${minutes}`;
	});

	public readonly freeMarginMinutes = $derived.by<number>(() => {
		return Math.round(this.projectedPlan.freeMarginSeconds / 60);
	});

	constructor(
		repositoryOrDeps?: ISessionPlanRepository | PlanningStateDependencies,
		timerState?: TimerState,
		tasksState?: TasksState
	) {
		if (
			repositoryOrDeps &&
			('getActivePlan' in repositoryOrDeps ||
				'saveActivePlan' in repositoryOrDeps ||
				'clearActivePlan' in repositoryOrDeps)
		) {
			this.repository = repositoryOrDeps as ISessionPlanRepository;
			this.timerState = timerState;
			this.tasksState = tasksState;
		} else if (repositoryOrDeps && typeof repositoryOrDeps === 'object') {
			const deps = repositoryOrDeps as PlanningStateDependencies;
			this.repository = deps.repository ?? new LocalStoragePlanRepository();
			this.timerState = deps.timerState;
			this.tasksState = deps.tasksState;
		} else {
			this.repository = new LocalStoragePlanRepository();
			this.timerState = timerState;
			this.tasksState = tasksState;
		}
	}

	private buildPlanFromDraft(): SessionPlan {
		const scheduledStartTimestamp =
			this._scheduledStartTime === 'now'
				? Date.now()
				: parseTimeToTimestamp(this._scheduledStartTime);

		let plan: SessionPlan;

		if (this._targetMode === 'blocks') {
			plan = calculateSessionBudgetByBlocks({
				blockCount: this._blockCount,
				sessionConfig: this.currentSessionConfig,
				scheduledStartTimestamp
			});
		} else {
			let targetEnd = parseTimeToTimestamp(
				this._targetEndTime,
				new SvelteDate(scheduledStartTimestamp)
			);
			if (targetEnd <= scheduledStartTimestamp) {
				targetEnd += 24 * 60 * 60 * 1000;
			}
			plan = calculateSessionBudgetByEndTime({
				scheduledStartTimestamp,
				targetEndTimestamp: targetEnd,
				sessionConfig: this.currentSessionConfig
			});
		}

		if (this._draftTaskAssignments.size > 0 && plan.blocks.length > 0) {
			for (const [blockIndex, taskId] of this._draftTaskAssignments.entries()) {
				if (
					blockIndex < plan.blocks.length &&
					plan.blocks[blockIndex].mode === 'focus' &&
					taskId &&
					taskId.trim().length > 0
				) {
					try {
						plan = assignTaskToBlock(plan, blockIndex, taskId);
					} catch {
						// Ignore incompatible assignments in draft
					}
				}
			}
		}

		return plan;
	}

	/**
	 * Loads activePlan from repository and restores planning state if present.
	 */
	public async load(): Promise<void> {
		this._isLoading = true;
		try {
			const plan = await this.repository.getActivePlan();
			if (plan) {
				this._activePlan = plan;
				this._targetMode = plan.targetMode;
				this._focusMinutes = Math.round(plan.sessionConfig.focusDurationSeconds / 60);
				this._shortBreakMinutes = Math.round(plan.sessionConfig.shortBreakDurationSeconds / 60);
				this._longBreakMinutes = Math.round(plan.sessionConfig.longBreakDurationSeconds / 60);
				this._longBreakInterval = plan.sessionConfig.roundsBeforeLongBreak;
				const focusBlocks = plan.blocks.filter((b) => b.mode === 'focus');
				this._blockCount = Math.max(1, focusBlocks.length);

				const inProgressIndex = plan.blocks.findIndex((b) => b.status === 'in_progress');
				if (inProgressIndex !== -1) {
					this._activeBlockIndex = inProgressIndex;
				} else {
					const firstPending = plan.blocks.findIndex((b) => b.status === 'pending');
					this._activeBlockIndex = firstPending !== -1 ? firstPending : 0;
				}

				const draftMap = new SvelteMap<number, string>();
				for (const b of plan.blocks) {
					if (b.assignedTaskId) {
						draftMap.set(b.index, b.assignedTaskId);
					}
				}
				this._draftTaskAssignments = draftMap;
			} else {
				this._activePlan = null;
			}
			this._isLoaded = true;
		} finally {
			this._isLoading = false;
		}
	}

	public setTargetMode(mode: PlanTargetMode): void {
		if (mode === 'blocks' || mode === 'end_time') {
			this._targetMode = mode;
		}
	}

	public setBlockCount(count: number): void {
		if (typeof count === 'number' && Number.isFinite(count)) {
			this._blockCount = Math.max(1, Math.min(24, Math.round(count)));
		}
	}

	public setFocusMinutes(minutes: number): void {
		if (typeof minutes === 'number' && Number.isFinite(minutes)) {
			this._focusMinutes = Math.max(1, Math.min(120, Math.round(minutes)));
		}
	}

	public setShortBreakMinutes(minutes: number): void {
		if (typeof minutes === 'number' && Number.isFinite(minutes)) {
			this._shortBreakMinutes = Math.max(1, Math.min(60, Math.round(minutes)));
		}
	}

	public setLongBreakMinutes(minutes: number): void {
		if (typeof minutes === 'number' && Number.isFinite(minutes)) {
			this._longBreakMinutes = Math.max(1, Math.min(90, Math.round(minutes)));
		}
	}

	public setLongBreakInterval(interval: number): void {
		if (typeof interval === 'number' && Number.isFinite(interval)) {
			this._longBreakInterval = Math.max(1, Math.min(12, Math.round(interval)));
		}
	}

	public setTargetEndTime(timeStr: string): void {
		if (typeof timeStr === 'string' && timeStr.trim().length > 0) {
			this._targetEndTime = timeStr.trim();
		}
	}

	public setScheduledStartTime(timeStr: string): void {
		if (typeof timeStr === 'string' && timeStr.trim().length > 0) {
			this._scheduledStartTime = timeStr.trim();
		}
	}

	/**
	 * Assigns a task to a block. In draft mode, updates draft assignments.
	 * In active session, applies forward-only assignment.
	 */
	public assignTaskToBlock(blockIndex: number, taskId: string): void {
		if (typeof taskId !== 'string' || taskId.trim().length === 0) {
			return;
		}

		if (this._activePlan === null) {
			const targetBlock = this.projectedPlan.blocks[blockIndex];
			if (targetBlock && targetBlock.mode !== 'focus') {
				return;
			}
			const updated = new SvelteMap(this._draftTaskAssignments);
			updated.set(blockIndex, taskId.trim());
			this._draftTaskAssignments = updated;
			return;
		}

		if (blockIndex < this._activeBlockIndex || blockIndex >= this._activePlan.blocks.length) {
			return;
		}

		const targetBlock = this._activePlan.blocks[blockIndex];
		if (targetBlock.mode !== 'focus') {
			return;
		}

		this._activePlan = assignTaskToBlock(this._activePlan, blockIndex, taskId);
		void this.repository.saveActivePlan(this._activePlan);

		if (blockIndex === this._activeBlockIndex && this.tasksState) {
			this.tasksState.setActiveTask(taskId.trim());
		}
	}

	/**
	 * Unassigns a task from a block. In draft mode, updates draft assignments.
	 * In active session, applies forward-only unassignment.
	 */
	public unassignTaskFromBlock(blockIndex: number): void {
		if (this._activePlan === null) {
			const updated = new SvelteMap(this._draftTaskAssignments);
			updated.delete(blockIndex);
			this._draftTaskAssignments = updated;
			return;
		}

		if (blockIndex < this._activeBlockIndex || blockIndex >= this._activePlan.blocks.length) {
			return;
		}

		this._activePlan = unassignTaskFromBlock(this._activePlan, blockIndex);
		void this.repository.saveActivePlan(this._activePlan);

		if (blockIndex === this._activeBlockIndex && this.tasksState) {
			this.tasksState.setActiveTask(null);
		}
	}

	/**
	 * Finds first available focus block without an assigned task, slots taskId into it,
	 * and returns the block index (or null if none found).
	 */
	public slotTaskIntoNextAvailableBlock(taskId: string): number | null {
		if (typeof taskId !== 'string' || taskId.trim().length === 0) {
			return null;
		}

		if (this._activePlan === null) {
			const plan = this.projectedPlan;
			for (const block of plan.blocks) {
				if (block.mode === 'focus' && !this._draftTaskAssignments.has(block.index)) {
					this.assignTaskToBlock(block.index, taskId);
					return block.index;
				}
			}
			return null;
		}

		for (let i = this._activeBlockIndex; i < this._activePlan.blocks.length; i++) {
			const block = this._activePlan.blocks[i];
			if (block.mode === 'focus' && !block.assignedTaskId) {
				this.assignTaskToBlock(block.index, taskId);
				return block.index;
			}
		}

		return null;
	}

	/**
	 * Starts the session from current draft inputs:
	 * Marks block 0 as 'in_progress', persists to repository,
	 * optionally configures and starts timerState, and sets active task on tasksState.
	 */
	public async startSession(
		customTimerState?: TimerState,
		customTasksState?: TasksState
	): Promise<SessionPlan> {
		let plan = this.buildPlanFromDraft();

		if (plan.blocks.length > 0) {
			plan = updateBlockStatus(plan, 0, 'in_progress');
		}

		this._activePlan = plan;
		this._activeBlockIndex = 0;

		await this.repository.saveActivePlan(this._activePlan);

		const timer = customTimerState ?? this.timerState;
		const tasks = customTasksState ?? this.tasksState;

		if (plan.blocks.length > 0 && plan.blocks[0].assignedTaskId && tasks) {
			tasks.setActiveTask(plan.blocks[0].assignedTaskId);
		}

		if (timer) {
			timer.updateConfig(plan.sessionConfig);
			timer.start();
		}

		return plan;
	}

	/**
	 * Ends the active session, clears activePlan from repository, and resets active index.
	 */
	public async endSession(customTimerState?: TimerState): Promise<void> {
		await this.repository.clearActivePlan();
		this._activePlan = null;
		this._activeBlockIndex = 0;

		const timer = customTimerState ?? this.timerState;
		if (timer) {
			timer.reset();
		}
	}

	/**
	 * Handles timer block completion:
	 * Marks current block completed, advances activeBlockIndex to next block if available,
	 * sets in_progress on new block, updates task on tasksState if new block is focus,
	 * or marks plan completed if no next block, and persists updated plan.
	 */
	public async onTimerBlockCompleted(
		completedMode?: TimerMode,
		customTimerState?: TimerState,
		customTasksState?: TasksState
	): Promise<void> {
		if (!this._activePlan || this._activePlan.blocks.length === 0) {
			return;
		}

		if (this._activeBlockIndex >= this._activePlan.blocks.length) {
			return;
		}

		let updatedPlan = updateBlockStatus(this._activePlan, this._activeBlockIndex, 'completed');

		if (this._activeBlockIndex + 1 < updatedPlan.blocks.length) {
			this._activeBlockIndex++;
			updatedPlan = updateBlockStatus(updatedPlan, this._activeBlockIndex, 'in_progress');

			const nextBlock = updatedPlan.blocks[this._activeBlockIndex];
			const tasks = customTasksState ?? this.tasksState;
			if (nextBlock.mode === 'focus' && nextBlock.assignedTaskId && tasks) {
				tasks.setActiveTask(nextBlock.assignedTaskId);
			}
		}

		this._activePlan = updatedPlan;
		await this.repository.saveActivePlan(this._activePlan);
	}

	/**
	 * In an active session, updates config and recalculates future blocks (index > activeBlockIndex)
	 * forward-only without mutating past or active blocks.
	 */
	public async updateUpcomingPlanForwardOnly(newConfig: Partial<TimerConfig>): Promise<void> {
		if (!this._activePlan || this.isPlanCompleted) {
			return;
		}

		const updatedConfig: TimerConfig = {
			...this._activePlan.sessionConfig,
			...newConfig
		};
		validateTimerConfig(updatedConfig);

		if (newConfig.focusDurationSeconds !== undefined) {
			this._focusMinutes = Math.round(newConfig.focusDurationSeconds / 60);
		}
		if (newConfig.shortBreakDurationSeconds !== undefined) {
			this._shortBreakMinutes = Math.round(newConfig.shortBreakDurationSeconds / 60);
		}
		if (newConfig.longBreakDurationSeconds !== undefined) {
			this._longBreakMinutes = Math.round(newConfig.longBreakDurationSeconds / 60);
		}
		if (newConfig.roundsBeforeLongBreak !== undefined) {
			this._longBreakInterval = newConfig.roundsBeforeLongBreak;
		}

		const newBlocks = this._activePlan.blocks.map((b) => {
			if (b.index <= this._activeBlockIndex) {
				return b;
			}

			let newDuration = b.durationSeconds;
			if (b.mode === 'focus' && newConfig.focusDurationSeconds !== undefined) {
				newDuration = newConfig.focusDurationSeconds;
			} else if (b.mode === 'shortBreak' && newConfig.shortBreakDurationSeconds !== undefined) {
				newDuration = newConfig.shortBreakDurationSeconds;
			} else if (b.mode === 'longBreak' && newConfig.longBreakDurationSeconds !== undefined) {
				newDuration = newConfig.longBreakDurationSeconds;
			}

			return Object.freeze({
				...b,
				durationSeconds: newDuration
			});
		});

		let targetEndTimestamp = this._activePlan.targetEndTimestamp;
		let freeMarginSeconds = this._activePlan.freeMarginSeconds;

		if (this._activePlan.targetMode === 'blocks') {
			if (this._activePlan.scheduledStartTimestamp !== undefined) {
				const totalDuration = newBlocks.reduce((acc, b) => acc + b.durationSeconds, 0);
				targetEndTimestamp = this._activePlan.scheduledStartTimestamp + totalDuration * 1000;
			}
		} else {
			if (
				this._activePlan.scheduledStartTimestamp !== undefined &&
				targetEndTimestamp !== undefined
			) {
				const windowSeconds = Math.floor(
					(targetEndTimestamp - this._activePlan.scheduledStartTimestamp) / 1000
				);
				const totalAllocated = newBlocks.reduce((acc, b) => acc + b.durationSeconds, 0);
				freeMarginSeconds = Math.max(0, windowSeconds - totalAllocated);
			}
		}

		const updatedPlan: SessionPlan = Object.freeze({
			...this._activePlan,
			sessionConfig: Object.freeze(updatedConfig),
			blocks: Object.freeze(newBlocks),
			targetEndTimestamp,
			freeMarginSeconds
		});

		validateSessionPlan(updatedPlan);
		this._activePlan = updatedPlan;
		await this.repository.saveActivePlan(this._activePlan);

		const timer = this.timerState;
		if (timer) {
			timer.updateConfig(newConfig);
		}
	}
}

/**
 * Factory function to create isolated PlanningState instances.
 */
export function createPlanningState(
	repositoryOrDeps?: ISessionPlanRepository | PlanningStateDependencies,
	timerState?: TimerState,
	tasksState?: TasksState
): PlanningState {
	return new PlanningState(repositoryOrDeps, timerState, tasksState);
}

/**
 * Global singleton reactive planning state instance for the application.
 */
export const planningState = new PlanningState(
	new LocalStoragePlanRepository(),
	defaultTimerState,
	defaultTasksState
);
