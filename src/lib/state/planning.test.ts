import { describe, it, expect, beforeEach, vi } from 'vitest';
import { PlanningState, createPlanningState, planningState } from './planning.svelte';
import type { ISessionPlanRepository } from '../domain/ports/session-plan-repository.port';
import {
	type SessionPlan,
	calculateSessionBudgetByBlocks,
	updateBlockStatus
} from '../domain/planning/session-plan.entity';
import { TimerState } from './timer.svelte';
import { TasksState } from './tasks.svelte';
import type { ITimerTicker } from '../domain/ports/timer-ticker.port';
import type { IAudioNotifier } from '../domain/ports/IAudioNotifier';
import type { ITaskRepository } from '../domain/ports/task-repository.port';
import type { FocusTask } from '../domain/tasks/task.entity';
import { sortFocusTasks } from '../domain/ports/task-repository.port';

class MockSessionPlanRepository implements ISessionPlanRepository {
	private activePlan: SessionPlan | null = null;
	public getActivePlanCallCount = 0;
	public saveActivePlanCallCount = 0;
	public clearActivePlanCallCount = 0;

	constructor(initialPlan: SessionPlan | null = null) {
		this.activePlan = initialPlan;
	}

	async getActivePlan(): Promise<SessionPlan | null> {
		this.getActivePlanCallCount++;
		return this.activePlan;
	}

	async saveActivePlan(plan: SessionPlan): Promise<void> {
		this.saveActivePlanCallCount++;
		this.activePlan = plan;
	}

	async clearActivePlan(): Promise<void> {
		this.clearActivePlanCallCount++;
		this.activePlan = null;
	}
}

class MockTicker implements ITimerTicker {
	public isRunning = false;
	start(): void {
		this.isRunning = true;
	}
	stop(): void {
		this.isRunning = false;
	}
	destroy(): void {
		this.isRunning = false;
	}
}

class MockAudioNotifier implements IAudioNotifier {
	async notifyBlockCompleted(): Promise<void> {}
	async unlock(): Promise<void> {}
}

class MockTaskRepository implements ITaskRepository {
	private tasks = new Map<string, FocusTask>();

	async getAll(): Promise<readonly FocusTask[]> {
		return sortFocusTasks(Array.from(this.tasks.values()));
	}

	async getPending(): Promise<readonly FocusTask[]> {
		return sortFocusTasks(Array.from(this.tasks.values()).filter((t) => !t.completed));
	}

	async save(task: FocusTask): Promise<void> {
		this.tasks.set(task.id, task);
	}

	async saveBatch(tasks: readonly FocusTask[]): Promise<void> {
		for (const t of tasks) {
			this.tasks.set(t.id, t);
		}
	}

	async delete(taskId: string): Promise<void> {
		this.tasks.delete(taskId);
	}

	async clearCompleted(): Promise<void> {
		for (const [id, t] of this.tasks.entries()) {
			if (t.completed) this.tasks.delete(id);
		}
	}

	async clearAll(): Promise<void> {
		this.tasks.clear();
	}
}

describe('PlanningState', () => {
	let repo: MockSessionPlanRepository;
	let state: PlanningState;
	let timer: TimerState;
	let tasks: TasksState;

	beforeEach(() => {
		repo = new MockSessionPlanRepository();
		timer = new TimerState(undefined, new MockTicker(), new MockAudioNotifier());
		tasks = new TasksState(new MockTaskRepository());
		state = createPlanningState(repo, timer, tasks);
	});

	describe('Initial defaults', () => {
		it('should initialize with standard default draft values', () => {
			expect(state.targetMode).toBe('blocks');
			expect(state.blockCount).toBe(4);
			expect(state.focusMinutes).toBe(25);
			expect(state.shortBreakMinutes).toBe(5);
			expect(state.longBreakMinutes).toBe(15);
			expect(state.longBreakInterval).toBe(4);
			expect(state.scheduledStartTime).toBe('now');
			expect(typeof state.targetEndTime).toBe('string');
			expect(state.targetEndTime).toMatch(/^\d{2}:\d{2}$/);
			expect(state.draftTaskAssignments.size).toBe(0);
			expect(state.activePlan).toBeNull();
			expect(state.activeBlockIndex).toBe(0);
			expect(state.activeBlock).toBeNull();
			expect(state.isSessionActive).toBe(false);
			expect(state.isPlanCompleted).toBe(false);
			expect(state.isLoading).toBe(false);
			expect(state.isLoaded).toBe(false);
		});

		it('should derive currentSessionConfig from draft minutes in seconds', () => {
			expect(state.currentSessionConfig).toEqual({
				focusDurationSeconds: 1500,
				shortBreakDurationSeconds: 300,
				longBreakDurationSeconds: 900,
				roundsBeforeLongBreak: 4
			});
		});

		it('should derive a valid projectedPlan with alternating blocks ending on focus', () => {
			const projected = state.projectedPlan;
			expect(projected.targetMode).toBe('blocks');
			// 4 focus blocks + 3 short breaks = 7 blocks
			expect(projected.blocks).toHaveLength(7);
			expect(projected.blocks[0].mode).toBe('focus');
			expect(projected.blocks[1].mode).toBe('shortBreak');
			expect(projected.blocks[6].mode).toBe('focus');
			expect(projected.blocks.every((b) => b.status === 'pending')).toBe(true);
		});
	});

	describe('Setters with boundary clamping', () => {
		it('should set targetMode between blocks and end_time', () => {
			state.setTargetMode('end_time');
			expect(state.targetMode).toBe('end_time');

			state.setTargetMode('blocks');
			expect(state.targetMode).toBe('blocks');
		});

		it('should clamp blockCount between 1 and 24', () => {
			state.setBlockCount(0);
			expect(state.blockCount).toBe(1);

			state.setBlockCount(30);
			expect(state.blockCount).toBe(24);

			state.setBlockCount(8);
			expect(state.blockCount).toBe(8);
		});

		it('should clamp focusMinutes between 1 and 120', () => {
			state.setFocusMinutes(0);
			expect(state.focusMinutes).toBe(1);

			state.setFocusMinutes(200);
			expect(state.focusMinutes).toBe(120);

			state.setFocusMinutes(50);
			expect(state.focusMinutes).toBe(50);
		});

		it('should clamp shortBreakMinutes between 1 and 60', () => {
			state.setShortBreakMinutes(-5);
			expect(state.shortBreakMinutes).toBe(1);

			state.setShortBreakMinutes(90);
			expect(state.shortBreakMinutes).toBe(60);

			state.setShortBreakMinutes(10);
			expect(state.shortBreakMinutes).toBe(10);
		});

		it('should clamp longBreakMinutes between 1 and 90', () => {
			state.setLongBreakMinutes(0);
			expect(state.longBreakMinutes).toBe(1);

			state.setLongBreakMinutes(120);
			expect(state.longBreakMinutes).toBe(90);

			state.setLongBreakMinutes(30);
			expect(state.longBreakMinutes).toBe(30);
		});

		it('should clamp longBreakInterval between 1 and 12', () => {
			state.setLongBreakInterval(0);
			expect(state.longBreakInterval).toBe(1);

			state.setLongBreakInterval(20);
			expect(state.longBreakInterval).toBe(12);

			state.setLongBreakInterval(3);
			expect(state.longBreakInterval).toBe(3);
		});

		it('should update targetEndTime and scheduledStartTime strings', () => {
			state.setTargetEndTime('19:45');
			expect(state.targetEndTime).toBe('19:45');

			state.setScheduledStartTime('08:30');
			expect(state.scheduledStartTime).toBe('08:30');
		});
	});

	describe('Task slotting in draft mode', () => {
		it('should assign and unassign task to draft block', () => {
			state.assignTaskToBlock(0, 'task-123');
			expect(state.draftTaskAssignments.get(0)).toBe('task-123');
			expect(state.projectedPlan.blocks[0].assignedTaskId).toBe('task-123');

			state.unassignTaskFromBlock(0);
			expect(state.draftTaskAssignments.has(0)).toBe(false);
			expect(state.projectedPlan.blocks[0].assignedTaskId).toBeUndefined();
		});

		it('should not assign task to non-focus block in draft', () => {
			// Block 1 is a shortBreak
			state.assignTaskToBlock(1, 'task-break');
			expect(state.draftTaskAssignments.has(1)).toBe(false);
			expect(state.projectedPlan.blocks[1].assignedTaskId).toBeUndefined();
		});

		it('should slot task into next available focus block sequentially', () => {
			// 4 focus blocks exist at indices 0, 2, 4, 6
			const b1 = state.slotTaskIntoNextAvailableBlock('task-a');
			expect(b1).toBe(0);
			expect(state.draftTaskAssignments.get(0)).toBe('task-a');

			const b2 = state.slotTaskIntoNextAvailableBlock('task-b');
			expect(b2).toBe(2);
			expect(state.draftTaskAssignments.get(2)).toBe('task-b');

			const b3 = state.slotTaskIntoNextAvailableBlock('task-c');
			expect(b3).toBe(4);

			const b4 = state.slotTaskIntoNextAvailableBlock('task-d');
			expect(b4).toBe(6);

			// All 4 focus blocks are slotted
			const b5 = state.slotTaskIntoNextAvailableBlock('task-overflow');
			expect(b5).toBeNull();
		});
	});

	describe('startSession', () => {
		it('should start session without external timer and tasks state', async () => {
			const isolatedState = createPlanningState(repo);
			isolatedState.assignTaskToBlock(0, 'task-init');

			const plan = await isolatedState.startSession();

			expect(isolatedState.isSessionActive).toBe(true);
			expect(isolatedState.activePlan).not.toBeNull();
			expect(isolatedState.activeBlockIndex).toBe(0);
			expect(isolatedState.activeBlock?.status).toBe('in_progress');
			expect(isolatedState.activeBlock?.assignedTaskId).toBe('task-init');
			expect(repo.saveActivePlanCallCount).toBe(1);
			expect(plan.id).toBe(isolatedState.activePlan?.id);
		});

		it('should configure and start timerState and set active task on tasksState', async () => {
			await tasks.createTask('Focus Task 1');
			const pending = tasks.pendingTasks;
			const taskId = pending[0].id;

			state.assignTaskToBlock(0, taskId);

			const startSpy = vi.spyOn(timer, 'start');
			const updateConfigSpy = vi.spyOn(timer, 'updateConfig');
			const setActiveTaskSpy = vi.spyOn(tasks, 'setActiveTask');

			await state.startSession();

			expect(updateConfigSpy).toHaveBeenCalledWith(state.currentSessionConfig);
			expect(setActiveTaskSpy).toHaveBeenCalledWith(taskId);
			expect(startSpy).toHaveBeenCalled();
			expect(state.isSessionActive).toBe(true);
		});

		it('should accept custom timerState and tasksState overrides', async () => {
			const customTimer = new TimerState(undefined, new MockTicker(), new MockAudioNotifier());
			const customTasks = new TasksState(new MockTaskRepository());
			await customTasks.createTask('Custom Task');
			const customTaskId = customTasks.pendingTasks[0].id;

			state.assignTaskToBlock(0, customTaskId);

			const customTimerSpy = vi.spyOn(customTimer, 'start');
			const customTasksSpy = vi.spyOn(customTasks, 'setActiveTask');

			await state.startSession(customTimer, customTasks);

			expect(customTimerSpy).toHaveBeenCalled();
			expect(customTasksSpy).toHaveBeenCalledWith(customTaskId);
		});
	});

	describe('onTimerBlockCompleted', () => {
		it('should advance from block 0 to block 1 and persist update', async () => {
			await state.startSession();
			expect(state.activeBlockIndex).toBe(0);
			expect(state.activeBlock?.status).toBe('in_progress');

			await state.onTimerBlockCompleted('focus');

			expect(state.activeBlockIndex).toBe(1);
			expect(state.activePlan?.blocks[0].status).toBe('completed');
			expect(state.activePlan?.blocks[1].status).toBe('in_progress');
			expect(repo.saveActivePlanCallCount).toBeGreaterThanOrEqual(2);
		});

		it('should advance to next focus block and update active task on tasksState', async () => {
			await tasks.createTask('Task for Block 2');
			const taskId = tasks.pendingTasks[0].id;
			state.assignTaskToBlock(2, taskId);

			await state.startSession();

			// Complete block 0 (focus) -> moves to block 1 (short break)
			await state.onTimerBlockCompleted('focus');
			expect(state.activeBlockIndex).toBe(1);

			const setActiveTaskSpy = vi.spyOn(tasks, 'setActiveTask');

			// Complete block 1 (short break) -> moves to block 2 (focus with task)
			await state.onTimerBlockCompleted('shortBreak');
			expect(state.activeBlockIndex).toBe(2);
			expect(state.activeBlock?.mode).toBe('focus');
			expect(setActiveTaskSpy).toHaveBeenCalledWith(taskId);
		});

		it('should complete plan when the last block completes', async () => {
			state.setBlockCount(1); // 1 focus block only, 0 breaks
			await state.startSession();

			expect(state.isSessionActive).toBe(true);
			expect(state.isPlanCompleted).toBe(false);

			await state.onTimerBlockCompleted('focus');

			expect(state.activePlan?.blocks[0].status).toBe('completed');
			expect(state.isPlanCompleted).toBe(true);
			expect(state.isSessionActive).toBe(false);
		});
	});

	describe('endSession', () => {
		it('should clear active plan from repository, reset state, and reset timer', async () => {
			await state.startSession();
			expect(state.isSessionActive).toBe(true);

			const resetSpy = vi.spyOn(timer, 'reset');

			await state.endSession();

			expect(state.activePlan).toBeNull();
			expect(state.activeBlockIndex).toBe(0);
			expect(state.isSessionActive).toBe(false);
			expect(repo.clearActivePlanCallCount).toBe(1);
			expect(resetSpy).toHaveBeenCalled();
		});
	});

	describe('load', () => {
		it('should restore active plan and state from repository', async () => {
			const savedPlan = calculateSessionBudgetByBlocks({
				blockCount: 3,
				sessionConfig: {
					focusDurationSeconds: 3000, // 50 min
					shortBreakDurationSeconds: 600, // 10 min
					longBreakDurationSeconds: 1200, // 20 min
					roundsBeforeLongBreak: 3
				}
			});
			const inProgressPlan = updateBlockStatus(savedPlan, 1, 'in_progress');
			await repo.saveActivePlan(inProgressPlan);

			const newState = createPlanningState(repo);
			expect(newState.isLoaded).toBe(false);

			await newState.load();

			expect(newState.isLoaded).toBe(true);
			expect(newState.activePlan?.id).toBe(savedPlan.id);
			expect(newState.focusMinutes).toBe(50);
			expect(newState.shortBreakMinutes).toBe(10);
			expect(newState.longBreakMinutes).toBe(20);
			expect(newState.longBreakInterval).toBe(3);
			expect(newState.blockCount).toBe(3);
			expect(newState.activeBlockIndex).toBe(1);
		});

		it('should handle empty repository gracefully during load', async () => {
			const newState = createPlanningState(repo);
			await newState.load();

			expect(newState.isLoaded).toBe(true);
			expect(newState.activePlan).toBeNull();
		});
	});

	describe('Forward-only updates during active session', () => {
		it('should prevent mutating past blocks during an active session', async () => {
			await state.startSession();
			// Complete block 0, now at block 1
			await state.onTimerBlockCompleted('focus');
			expect(state.activeBlockIndex).toBe(1);

			// Attempt assigning task to past block 0
			state.assignTaskToBlock(0, 'task-past');
			expect(state.activePlan?.blocks[0].assignedTaskId).toBeUndefined();

			// Assigning to upcoming block 2 succeeds
			state.assignTaskToBlock(2, 'task-future');
			expect(state.activePlan?.blocks[2].assignedTaskId).toBe('task-future');
		});

		it('should unassign task from current or upcoming blocks only', async () => {
			state.assignTaskToBlock(2, 'task-2');
			await state.startSession();

			state.unassignTaskFromBlock(2);
			expect(state.activePlan?.blocks[2].assignedTaskId).toBeUndefined();
		});

		it('should slot task into next available upcoming block during active session', async () => {
			state.assignTaskToBlock(0, 'task-current');
			await state.startSession();
			// Block 0 is active and assigned. Next unassigned focus block is index 2
			const slotted = state.slotTaskIntoNextAvailableBlock('task-next');
			expect(slotted).toBe(2);
			expect(state.activePlan?.blocks[2].assignedTaskId).toBe('task-next');
		});

		it('should recalculate future block durations without altering past or active block', async () => {
			await state.startSession();
			// At block 0 (focus: 1500s)
			await state.onTimerBlockCompleted('focus');
			// Now at block 1 (short break: 300s)
			expect(state.activeBlockIndex).toBe(1);

			await state.updateUpcomingPlanForwardOnly({
				focusDurationSeconds: 1800, // 30 min
				shortBreakDurationSeconds: 420 // 7 min
			});

			const blocks = state.activePlan!.blocks;
			// Block 0 (past focus): unchanged (1500s)
			expect(blocks[0].durationSeconds).toBe(1500);
			// Block 1 (active short break): unchanged (300s)
			expect(blocks[1].durationSeconds).toBe(300);
			// Block 2 (future focus): updated to 1800s
			expect(blocks[2].durationSeconds).toBe(1800);
			// Block 3 (future short break): updated to 420s
			expect(blocks[3].durationSeconds).toBe(420);
			// Block 4 (future focus): updated to 1800s
			expect(blocks[4].durationSeconds).toBe(1800);
		});
	});

	describe('3-metric strip derived calculations', () => {
		it('should calculate totalFocusMinutes and totalBreakMinutes correctly', () => {
			state.setBlockCount(4);
			state.setFocusMinutes(25);
			state.setShortBreakMinutes(5);

			// 4 focus blocks of 25m = 100m
			expect(state.totalFocusMinutes).toBe(100);
			// 3 short break blocks of 5m = 15m
			expect(state.totalBreakMinutes).toBe(15);
			expect(state.freeMarginMinutes).toBe(0);
		});

		it('should calculate freeMarginMinutes in end_time mode', () => {
			state.setTargetMode('end_time');
			state.setScheduledStartTime('10:00');
			state.setTargetEndTime('12:00'); // 120 min window
			state.setFocusMinutes(25);
			state.setShortBreakMinutes(5);

			// 4 focus blocks (100m) + 3 breaks (15m) = 115m. 5m free margin.
			expect(state.totalFocusMinutes).toBe(100);
			expect(state.totalBreakMinutes).toBe(15);
			expect(state.freeMarginMinutes).toBe(5);
		});

		it('should format estimatedFinishTime as HH:mm string', () => {
			state.setScheduledStartTime('10:00');
			expect(state.estimatedFinishTime).toMatch(/^\d{2}:\d{2}$/);
		});
	});

	describe('Factory and singleton exports', () => {
		it('should export createPlanningState factory', () => {
			const instance = createPlanningState();
			expect(instance).toBeInstanceOf(PlanningState);
		});

		it('should export default planningState singleton', () => {
			expect(planningState).toBeInstanceOf(PlanningState);
		});
	});

	describe('Planning & Timer / Tasks Synchronization Specification', () => {
		it('should advance active block and mark block as skipped on timer.skip() domain event', async () => {
			await state.startSession();
			expect(state.activeBlockIndex).toBe(0);
			expect(state.activeBlock?.status).toBe('in_progress');

			// Skip block 0 (focus) via timer
			timer.skip();

			expect(state.activeBlockIndex).toBe(1);
			expect(state.activePlan?.blocks[0].status).toBe('skipped');
			expect(state.activePlan?.blocks[1].status).toBe('in_progress');
			expect(state.activeBlock?.mode).toBe('shortBreak');
		});

		it('should advance active block and mark block as completed on block-completed domain event', async () => {
			await state.startSession();
			expect(state.activeBlockIndex).toBe(0);

			await state.handleTimerDomainEvent({
				type: 'block-completed',
				mode: 'focus',
				round: 1,
				totalRoundsCompleted: 1,
				completedAt: new Date()
			});

			expect(state.activeBlockIndex).toBe(1);
			expect(state.activePlan?.blocks[0].status).toBe('completed');
			expect(state.activePlan?.blocks[1].status).toBe('in_progress');
		});

		it('should pause timer and complete plan when the last block is completed', async () => {
			state.setBlockCount(1); // 1 focus block
			await state.startSession();

			const pauseSpy = vi.spyOn(timer, 'pause');

			await state.handleTimerDomainEvent({
				type: 'block-completed',
				mode: 'focus',
				round: 1,
				totalRoundsCompleted: 1,
				completedAt: new Date()
			});

			expect(pauseSpy).toHaveBeenCalled();
			expect(state.activePlan?.blocks[0].status).toBe('completed');
			expect(state.isPlanCompleted).toBe(true);
			expect(state.isSessionActive).toBe(false);
		});

		it('should pause timer and complete plan when the last block is skipped', async () => {
			state.setBlockCount(1); // 1 focus block
			await state.startSession();

			const pauseSpy = vi.spyOn(timer, 'pause');

			timer.skip();

			expect(pauseSpy).toHaveBeenCalled();
			expect(state.activePlan?.blocks[0].status).toBe('skipped');
			expect(state.isPlanCompleted).toBe(true);
			expect(state.isSessionActive).toBe(false);
		});

		it('should accurately evaluate isPlanCompleted with mixed completed and skipped blocks', async () => {
			state.setBlockCount(2); // 3 blocks: focus, shortBreak, focus
			await state.startSession();

			// Skip block 0 (focus)
			timer.skip();
			expect(state.isPlanCompleted).toBe(false);

			// Complete block 1 (shortBreak)
			await state.handleTimerDomainEvent({
				type: 'block-completed',
				mode: 'shortBreak',
				round: 1,
				totalRoundsCompleted: 0,
				completedAt: new Date()
			});
			expect(state.isPlanCompleted).toBe(false);

			// Skip block 2 (focus - last block)
			timer.skip();

			expect(state.isPlanCompleted).toBe(true);
			expect(state.activePlan?.blocks[0].status).toBe('skipped');
			expect(state.activePlan?.blocks[1].status).toBe('completed');
			expect(state.activePlan?.blocks[2].status).toBe('skipped');
		});

		it('should sync active task in draft mode to block 0', async () => {
			await tasks.createTask('Draft Focus Task');
			const taskId = tasks.pendingTasks[0].id;

			// Pin task in tasksState
			tasks.setActiveTask(taskId);

			expect(state.draftTaskAssignments.get(0)).toBe(taskId);
			expect(state.projectedPlan.blocks[0].assignedTaskId).toBe(taskId);

			// Unpin task in tasksState
			tasks.setActiveTask(null);

			expect(state.draftTaskAssignments.has(0)).toBe(false);
			expect(state.projectedPlan.blocks[0].assignedTaskId).toBeUndefined();
		});

		it('should sync active task to focus block during active session', async () => {
			await tasks.createTask('Session Task 1');
			await tasks.createTask('Session Task 2');
			const [task1, task2] = tasks.pendingTasks;

			await state.startSession();
			expect(state.activeBlockIndex).toBe(0);
			expect(state.activeBlock?.mode).toBe('focus');

			// Pin task 1
			tasks.setActiveTask(task1.id);
			expect(state.activeBlock?.assignedTaskId).toBe(task1.id);
			expect(state.activePlan?.blocks[0].assignedTaskId).toBe(task1.id);

			// Change to task 2 via TaskPill
			tasks.setActiveTask(task2.id);
			expect(state.activeBlock?.assignedTaskId).toBe(task2.id);
			expect(state.activePlan?.blocks[0].assignedTaskId).toBe(task2.id);

			// Free focus (unassign)
			tasks.setActiveTask(null);
			expect(state.activeBlock?.assignedTaskId).toBeUndefined();
			expect(state.activePlan?.blocks[0].assignedTaskId).toBeUndefined();
		});

		it('should sync active task to next focus block when currently in break', async () => {
			await tasks.createTask('Break Planning Task');
			const taskId = tasks.pendingTasks[0].id;

			await state.startSession();
			// Advance to block 1 (short break)
			timer.skip();
			expect(state.activeBlockIndex).toBe(1);
			expect(state.activeBlock?.mode).toBe('shortBreak');

			// Pin task while in break
			tasks.setActiveTask(taskId);

			// Break block must NOT receive assignedTaskId
			expect(state.activePlan?.blocks[1].assignedTaskId).toBeUndefined();
			// Next focus block (index 2) must receive assignedTaskId
			expect(state.activePlan?.blocks[2].assignedTaskId).toBe(taskId);

			// Unpin task while in break
			tasks.setActiveTask(null);
			expect(state.activePlan?.blocks[2].assignedTaskId).toBeUndefined();
		});

		it('should update tasksState active task when timeline assigns/unassigns on active block', async () => {
			await tasks.createTask('Timeline Task');
			const taskId = tasks.pendingTasks[0].id;

			// In draft mode
			state.assignTaskToBlock(0, taskId);
			expect(tasks.activeTaskId).toBe(taskId);

			state.unassignTaskFromBlock(0);
			expect(tasks.activeTaskId).toBeNull();

			// In active session
			await state.startSession();
			state.assignTaskToBlock(0, taskId);
			expect(tasks.activeTaskId).toBe(taskId);

			state.unassignTaskFromBlock(0);
			expect(tasks.activeTaskId).toBeNull();
		});

		it('should automatically set active task when advancing into a focus block with assigned task', async () => {
			await tasks.createTask('Assigned Next Task');
			const taskId = tasks.pendingTasks[0].id;

			// Assign task to block 2
			state.assignTaskToBlock(2, taskId);
			await state.startSession();

			// Currently in block 0 (free focus)
			expect(tasks.activeTaskId).toBeNull();

			// Skip block 0 -> shortBreak (block 1)
			timer.skip();
			expect(state.activeBlockIndex).toBe(1);

			// Skip block 1 (shortBreak) -> focus block 2 (assigned)
			timer.skip();
			expect(state.activeBlockIndex).toBe(2);
			expect(state.activeBlock?.mode).toBe('focus');
			expect(tasks.activeTaskId).toBe(taskId);
		});

		it('should clear active task when advancing into a focus block without assigned task (Free Focus)', async () => {
			await tasks.createTask('First Task');
			const taskId = tasks.pendingTasks[0].id;

			state.assignTaskToBlock(0, taskId);
			await state.startSession();
			expect(tasks.activeTaskId).toBe(taskId);

			// Skip block 0 -> block 1 (break)
			timer.skip();
			// Skip block 1 -> block 2 (focus, unassigned)
			timer.skip();
			expect(state.activeBlockIndex).toBe(2);
			expect(state.activeBlock?.mode).toBe('focus');
			expect(state.activeBlock?.assignedTaskId).toBeUndefined();
			expect(tasks.activeTaskId).toBeNull();
		});
	});
});
