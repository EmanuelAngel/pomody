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
import type { DomainEvent, TimerConfig, TimerMode } from '../domain/timer/timer-fsm';
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
	private timerState?: TimerState;
	private tasksState?: TasksState;
	private _timerUnsubscribe?: () => void;
	private _tasksUnsubscribe?: () => void;

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
		return this._activePlan.blocks.every((b) => b.status === 'completed' || b.status === 'skipped');
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

		if (this.timerState) {
			this.connectTimer(this.timerState);
		}
		if (this.tasksState) {
			this.connectTasks(this.tasksState);
		}
	}

	/**
	 * Connects and subscribes to a TimerState instance for domain events.
	 */
	public connectTimer(timer: TimerState): () => void {
		this._timerUnsubscribe?.();
		this.timerState = timer;
		const unsubEvents = timer.onEvent((event) => {
			void this.handleTimerDomainEvent(event);
		});
		const unsubConfig = timer.onConfigChange((config) => {
			void this.handleTimerConfigChange(config);
		});
		this._timerUnsubscribe = () => {
			unsubEvents();
			unsubConfig();
		};

		if (!this._activePlan) {
			void this.handleTimerConfigChange(timer.config);
		}

		return () => {
			this._timerUnsubscribe?.();
			this._timerUnsubscribe = undefined;
		};
	}

	/**
	 * Connects and subscribes to a TasksState instance for bidirectional task synchronization.
	 */
	public connectTasks(tasks: TasksState): () => void {
		this._tasksUnsubscribe?.();
		this.tasksState = tasks;
		this._tasksUnsubscribe = tasks.onActiveTaskChange((taskId) => {
			this.handleActiveTaskChange(taskId);
		});
		return () => {
			this._tasksUnsubscribe?.();
			this._tasksUnsubscribe = undefined;
		};
	}

	/**
	 * Handles domain events from the TimerFSM.
	 */
	public async handleTimerDomainEvent(event: DomainEvent): Promise<void> {
		if (!this.isSessionActive || !this._activePlan) {
			return;
		}
		if (event.type === 'block-completed') {
			await this.onTimerBlockCompleted(event.mode);
		} else if (event.type === 'block-skipped') {
			await this.onTimerBlockSkipped(event.mode);
		}
	}

	/**
	 * Handles timer configuration changes (e.g. from SettingsDrawer or TimerState updates).
	 * If active session: applies forward-only update to upcoming blocks if config differs.
	 * If draft mode: aligns draft minutes and interval, automatically updating projected plan & stats.
	 */
	public async handleTimerConfigChange(config: TimerConfig): Promise<void> {
		if (this.isSessionActive && this._activePlan) {
			const current = this._activePlan.sessionConfig;
			if (
				current.focusDurationSeconds !== config.focusDurationSeconds ||
				current.shortBreakDurationSeconds !== config.shortBreakDurationSeconds ||
				current.longBreakDurationSeconds !== config.longBreakDurationSeconds ||
				current.roundsBeforeLongBreak !== config.roundsBeforeLongBreak
			) {
				await this.updateUpcomingPlanForwardOnly(config);
			}
		} else {
			const focusM = Math.round(config.focusDurationSeconds / 60);
			const shortM = Math.round(config.shortBreakDurationSeconds / 60);
			const longM = Math.round(config.longBreakDurationSeconds / 60);
			const interval = config.roundsBeforeLongBreak;

			if (this._focusMinutes !== focusM) {
				this._focusMinutes = focusM;
			}
			if (this._shortBreakMinutes !== shortM) {
				this._shortBreakMinutes = shortM;
			}
			if (this._longBreakMinutes !== longM) {
				this._longBreakMinutes = longM;
			}
			if (this._longBreakInterval !== interval) {
				this._longBreakInterval = interval;
			}
		}
	}

	/**
	 * Handles changes to active task in TasksState (from TaskPill or Backlog Pin/Unpin).
	 * Enforces rules:
	 * - During active session in focus mode: assigns to active block.
	 * - During active session in break mode: assigns to first subsequent focus block.
	 * - In draft mode: assigns to block 0 (first focus block).
	 * - When cleared (null): unassigns from the corresponding block.
	 * - Uses equality guards to avoid circular loops.
	 */
	public handleActiveTaskChange(taskId: string | null): void {
		if (this.isSessionActive && this._activePlan) {
			const activeBlock = this.activeBlock;
			if (!activeBlock) return;

			if (activeBlock.mode === 'focus') {
				if (taskId !== null) {
					if (activeBlock.assignedTaskId === taskId) return;
					this.assignTaskToBlock(this._activeBlockIndex, taskId);
				} else {
					if (!activeBlock.assignedTaskId) return;
					this.unassignTaskFromBlock(this._activeBlockIndex);
				}
			} else {
				// During break: find first subsequent focus block in timeline
				const nextFocusBlock = this._activePlan.blocks
					.slice(this._activeBlockIndex + 1)
					.find((b) => b.mode === 'focus');
				if (!nextFocusBlock) return;

				if (taskId !== null) {
					if (nextFocusBlock.assignedTaskId === taskId) return;
					this.assignTaskToBlock(nextFocusBlock.index, taskId);
				} else {
					if (!nextFocusBlock.assignedTaskId) return;
					this.unassignTaskFromBlock(nextFocusBlock.index);
				}
			}
		} else if (!this._activePlan) {
			// In draft mode: target first focus block (block 0)
			if (taskId !== null) {
				const currentAssignment = this._draftTaskAssignments.get(0);
				if (currentAssignment === taskId) return;
				this.assignTaskToBlock(0, taskId);
			} else {
				if (!this._draftTaskAssignments.has(0)) return;
				this.unassignTaskFromBlock(0);
			}
		}
	}

	/**
	 * Cleans up timer and tasks event listeners.
	 */
	public destroy(): void {
		this._timerUnsubscribe?.();
		this._timerUnsubscribe = undefined;
		this._tasksUnsubscribe?.();
		this._tasksUnsubscribe = undefined;
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
				if (this.timerState) {
					await this.handleTimerConfigChange(this.timerState.config);
				}
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
			const valid = Math.max(1, Math.min(120, Math.round(minutes)));
			if (this.isSessionActive && this._activePlan) {
				void this.updateUpcomingPlanForwardOnly({ focusDurationSeconds: valid * 60 });
			} else {
				this._focusMinutes = valid;
				if (this.timerState) {
					const seconds = valid * 60;
					if (this.timerState.config.focusDurationSeconds !== seconds) {
						this.timerState.updateConfig({ focusDurationSeconds: seconds });
					}
				}
			}
		}
	}

	public setShortBreakMinutes(minutes: number): void {
		if (typeof minutes === 'number' && Number.isFinite(minutes)) {
			const valid = Math.max(1, Math.min(60, Math.round(minutes)));
			if (this.isSessionActive && this._activePlan) {
				void this.updateUpcomingPlanForwardOnly({ shortBreakDurationSeconds: valid * 60 });
			} else {
				this._shortBreakMinutes = valid;
				if (this.timerState) {
					const seconds = valid * 60;
					if (this.timerState.config.shortBreakDurationSeconds !== seconds) {
						this.timerState.updateConfig({ shortBreakDurationSeconds: seconds });
					}
				}
			}
		}
	}

	public setLongBreakMinutes(minutes: number): void {
		if (typeof minutes === 'number' && Number.isFinite(minutes)) {
			const valid = Math.max(1, Math.min(90, Math.round(minutes)));
			if (this.isSessionActive && this._activePlan) {
				void this.updateUpcomingPlanForwardOnly({ longBreakDurationSeconds: valid * 60 });
			} else {
				this._longBreakMinutes = valid;
				if (this.timerState) {
					const seconds = valid * 60;
					if (this.timerState.config.longBreakDurationSeconds !== seconds) {
						this.timerState.updateConfig({ longBreakDurationSeconds: seconds });
					}
				}
			}
		}
	}

	public setLongBreakInterval(interval: number): void {
		if (typeof interval === 'number' && Number.isFinite(interval)) {
			const valid = Math.max(1, Math.min(12, Math.round(interval)));
			if (this.isSessionActive && this._activePlan) {
				void this.updateUpcomingPlanForwardOnly({ roundsBeforeLongBreak: valid });
			} else {
				this._longBreakInterval = valid;
				if (this.timerState) {
					if (this.timerState.config.roundsBeforeLongBreak !== valid) {
						this.timerState.updateConfig({ roundsBeforeLongBreak: valid });
					}
				}
			}
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
			const trimmed = taskId.trim();
			if (this._draftTaskAssignments.get(blockIndex) === trimmed) {
				return;
			}
			const updated = new SvelteMap(this._draftTaskAssignments);
			updated.set(blockIndex, trimmed);
			this._draftTaskAssignments = updated;

			if (blockIndex === 0 && this.tasksState) {
				this.tasksState.setActiveTask(trimmed);
			}
			return;
		}

		if (blockIndex < this._activeBlockIndex || blockIndex >= this._activePlan.blocks.length) {
			return;
		}

		const targetBlock = this._activePlan.blocks[blockIndex];
		if (targetBlock.mode !== 'focus') {
			return;
		}

		const trimmed = taskId.trim();
		if (targetBlock.assignedTaskId === trimmed) {
			return;
		}

		this._activePlan = assignTaskToBlock(this._activePlan, blockIndex, trimmed);
		void this.repository.saveActivePlan(this._activePlan);

		if (blockIndex === this._activeBlockIndex && this.tasksState) {
			this.tasksState.setActiveTask(trimmed);
		}
	}

	/**
	 * Unassigns a task from a block. In draft mode, updates draft assignments.
	 * In active session, applies forward-only unassignment.
	 */
	public unassignTaskFromBlock(blockIndex: number): void {
		if (this._activePlan === null) {
			if (!this._draftTaskAssignments.has(blockIndex)) {
				return;
			}
			const updated = new SvelteMap(this._draftTaskAssignments);
			updated.delete(blockIndex);
			this._draftTaskAssignments = updated;

			if (blockIndex === 0 && this.tasksState) {
				this.tasksState.setActiveTask(null);
			}
			return;
		}

		if (blockIndex < this._activeBlockIndex || blockIndex >= this._activePlan.blocks.length) {
			return;
		}

		const targetBlock = this._activePlan.blocks[blockIndex];
		if (!targetBlock.assignedTaskId) {
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
		if (customTimerState && customTimerState !== this.timerState) {
			this.connectTimer(customTimerState);
		}
		if (customTasksState && customTasksState !== this.tasksState) {
			this.connectTasks(customTasksState);
		}

		let plan = this.buildPlanFromDraft();

		if (plan.blocks.length > 0) {
			plan = updateBlockStatus(plan, 0, 'in_progress');
		}

		this._activePlan = plan;
		this._activeBlockIndex = 0;

		await this.repository.saveActivePlan(this._activePlan);

		const timer = customTimerState ?? this.timerState;
		const tasks = customTasksState ?? this.tasksState;

		if (plan.blocks.length > 0 && tasks) {
			if (plan.blocks[0].assignedTaskId) {
				tasks.setActiveTask(plan.blocks[0].assignedTaskId);
			} else {
				tasks.setActiveTask(null);
			}
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
	 * Advances the active block upon natural timer block completion or manual skip.
	 * Marks current block with targetStatus ('completed' | 'skipped').
	 * If there is a next block:
	 *   - Increments activeBlockIndex by 1.
	 *   - Marks next block as 'in_progress'.
	 *   - If next block is 'focus' and has assignedTaskId, sets active task on tasksState.
	 *   - If next block is 'focus' and has no assignedTaskId, clears active task on tasksState.
	 * If last block completed or skipped:
	 *   - Pauses the timer to prevent infinite cycles outside the plan budget.
	 * Persists updated plan to repository.
	 */
	private async advanceActiveBlock(
		targetStatus: 'completed' | 'skipped',
		customTimerState?: TimerState,
		customTasksState?: TasksState
	): Promise<void> {
		if (!this._activePlan || this._activePlan.blocks.length === 0) {
			return;
		}

		if (this._activeBlockIndex >= this._activePlan.blocks.length) {
			return;
		}

		let updatedPlan = updateBlockStatus(this._activePlan, this._activeBlockIndex, targetStatus);
		const timer = customTimerState ?? this.timerState;
		const tasks = customTasksState ?? this.tasksState;

		if (this._activeBlockIndex + 1 < updatedPlan.blocks.length) {
			this._activeBlockIndex++;
			updatedPlan = updateBlockStatus(updatedPlan, this._activeBlockIndex, 'in_progress');

			const nextBlock = updatedPlan.blocks[this._activeBlockIndex];
			if (nextBlock.mode === 'focus') {
				if (nextBlock.assignedTaskId && tasks) {
					tasks.setActiveTask(nextBlock.assignedTaskId);
				} else if (tasks) {
					tasks.setActiveTask(null);
				}
			}
		} else {
			if (timer) {
				timer.pause();
			}
		}

		this._activePlan = updatedPlan;
		await this.repository.saveActivePlan(this._activePlan);
	}

	/**
	 * Handles timer block completion:
	 * Marks current block completed, advances activeBlockIndex to next block if available,
	 * sets in_progress on new block, updates task on tasksState if new block is focus,
	 * or pauses timer if session plan is finished, and persists updated plan.
	 */
	public async onTimerBlockCompleted(
		completedMode?: TimerMode,
		customTimerState?: TimerState,
		customTasksState?: TasksState
	): Promise<void> {
		await this.advanceActiveBlock('completed', customTimerState, customTasksState);
	}

	/**
	 * Handles timer block skip:
	 * Marks current block skipped, advances activeBlockIndex to next block if available,
	 * sets in_progress on new block, updates task on tasksState if new block is focus,
	 * or pauses timer if session plan is finished, and persists updated plan.
	 */
	public async onTimerBlockSkipped(
		skippedMode?: TimerMode,
		customTimerState?: TimerState,
		customTasksState?: TasksState
	): Promise<void> {
		await this.advanceActiveBlock('skipped', customTimerState, customTasksState);
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

			if (b.mode === 'focus') {
				const newDuration = updatedConfig.focusDurationSeconds;
				return Object.freeze({
					...b,
					durationSeconds: newDuration
				});
			}

			const precedingFocusCount = this._activePlan!.blocks.slice(0, b.index).filter(
				(x) => x.mode === 'focus'
			).length;
			const isLongBreak = precedingFocusCount % updatedConfig.roundsBeforeLongBreak === 0;
			const newMode = isLongBreak ? 'longBreak' : 'shortBreak';
			const newDuration = isLongBreak
				? updatedConfig.longBreakDurationSeconds
				: updatedConfig.shortBreakDurationSeconds;

			return Object.freeze({
				...b,
				mode: newMode,
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

		const timer = this.timerState;
		if (timer) {
			const tc = timer.config;
			const hasDifference =
				(newConfig.focusDurationSeconds !== undefined &&
					tc.focusDurationSeconds !== newConfig.focusDurationSeconds) ||
				(newConfig.shortBreakDurationSeconds !== undefined &&
					tc.shortBreakDurationSeconds !== newConfig.shortBreakDurationSeconds) ||
				(newConfig.longBreakDurationSeconds !== undefined &&
					tc.longBreakDurationSeconds !== newConfig.longBreakDurationSeconds) ||
				(newConfig.roundsBeforeLongBreak !== undefined &&
					tc.roundsBeforeLongBreak !== newConfig.roundsBeforeLongBreak);

			if (hasDifference) {
				timer.updateConfig(newConfig);
			}
		}

		await this.repository.saveActivePlan(this._activePlan);
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
