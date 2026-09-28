import { describe, it, expect } from 'vitest';
import { render } from 'vitest-browser-svelte';
import { userEvent } from 'vitest/browser';
import PlanningView from './planning-view.svelte';
import { createTasksState } from '$lib/state/tasks.svelte';
import { createNavigationState } from '$lib/state/navigation.svelte';
import { createPlanningState } from '$lib/state/planning.svelte';
import { createTimerState } from '$lib/state/timer.svelte';
import type { ITaskRepository } from '$lib/domain/ports/task-repository.port';
import { sortFocusTasks } from '$lib/domain/ports/task-repository.port';
import { createFocusTask, toggleFocusTask, type FocusTask } from '$lib/domain/tasks/task.entity';
import type { ISessionPlanRepository } from '$lib/domain/ports/session-plan-repository.port';
import type { SessionPlan } from '$lib/domain/planning/session-plan.entity';

class MockSessionPlanRepository implements ISessionPlanRepository {
	private plan: SessionPlan | null = null;

	async getActivePlan(): Promise<SessionPlan | null> {
		return this.plan;
	}

	async saveActivePlan(plan: SessionPlan): Promise<void> {
		this.plan = plan;
	}

	async clearActivePlan(): Promise<void> {
		this.plan = null;
	}
}

class MockTaskRepository implements ITaskRepository {
	private tasks = new Map<string, FocusTask>();

	constructor(initialTasks: FocusTask[] = []) {
		for (const task of initialTasks) {
			this.tasks.set(task.id, task);
		}
	}

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
		for (const task of tasks) {
			this.tasks.set(task.id, task);
		}
	}

	async delete(taskId: string): Promise<void> {
		this.tasks.delete(taskId);
	}

	async clearCompleted(): Promise<void> {
		for (const [id, task] of this.tasks.entries()) {
			if (task.completed) {
				this.tasks.delete(id);
			}
		}
	}

	async clearAll(): Promise<void> {
		this.tasks.clear();
	}
}

describe('PlanningView (Client Browser)', () => {
	it('renders header, quick task input and empty state when backlog is empty', async () => {
		const repo = new MockTaskRepository();
		const tasksState = createTasksState(repo);
		await tasksState.load();
		const navigationState = createNavigationState('planning');

		const screen = await render(PlanningView, { tasksState, navigationState });

		// Heading and subtitle
		await expect.element(screen.getByRole('heading', { name: 'Planning' })).toBeVisible();
		await expect.element(screen.getByText('0 pending tasks')).toBeVisible();

		// Quick capture input
		const input = screen.getByRole('textbox', { name: /Add a new focus task/i });
		await expect.element(input).toBeVisible();

		// Empty state message
		await expect
			.element(screen.getByText('No pending tasks. Add one to plan your session.'))
			.toBeVisible();
		await expect.element(screen.getByText('Pending (0)')).toBeVisible();
	});

	it('creates a new task via quick capture input pressing Enter', async () => {
		const repo = new MockTaskRepository();
		const tasksState = createTasksState(repo);
		await tasksState.load();

		const screen = await render(PlanningView, { tasksState });
		const input = screen.getByRole('textbox', { name: /Add a new focus task/i });

		await input.fill('Configure port architecture');
		await userEvent.keyboard('{Enter}');

		await expect.element(screen.getByText('Configure port architecture')).toBeVisible();
		await expect.element(screen.getByText('Pending (1)')).toBeVisible();
		expect(tasksState.pendingTasks.length).toBe(1);
		expect(tasksState.pendingTasks[0].title).toBe('Configure port architecture');
	});

	it('creates a new task by clicking the plus button', async () => {
		const repo = new MockTaskRepository();
		const tasksState = createTasksState(repo);
		await tasksState.load();

		const screen = await render(PlanningView, { tasksState });
		const input = screen.getByRole('textbox', { name: /Add a new focus task/i });

		await input.fill('Review design tokens');
		const plusBtn = screen.getByRole('button', { name: 'Add task' });
		await expect.element(plusBtn).toBeVisible();
		await plusBtn.click();

		await expect.element(screen.getByText('Review design tokens')).toBeVisible();
		expect(tasksState.pendingTasks.length).toBe(1);
	});

	it('toggles task between pending and completed when clicking checkbox', async () => {
		const task = createFocusTask({ title: 'Write integration tests' });
		const repo = new MockTaskRepository([task]);
		const tasksState = createTasksState(repo);
		await tasksState.load();

		const screen = await render(PlanningView, { tasksState });

		const completeBtn = screen.getByRole('checkbox', {
			name: `Mark "${task.title}" as completed`
		});
		await expect.element(completeBtn).toBeVisible();
		await completeBtn.click();

		// Task should move to completed section
		await expect.element(screen.getByText('Pending (0)')).toBeVisible();
		await expect.element(screen.getByText('Completed (1)')).toBeVisible();
		expect(tasksState.pendingTasks.length).toBe(0);
		expect(tasksState.completedTasks.length).toBe(1);

		// Uncheck to reactivate
		const reactivateBtn = screen.getByRole('checkbox', {
			name: `Mark "${task.title}" as pending`
		});
		await expect.element(reactivateBtn).toBeVisible();
		await reactivateBtn.click();

		await expect.element(screen.getByText('Pending (1)')).toBeVisible();
		expect(tasksState.pendingTasks.length).toBe(1);
		expect(tasksState.completedTasks.length).toBe(0);
	});

	it('pins and unpins a task as active for the timer', async () => {
		const taskA = createFocusTask({ title: 'Main Task', order: 0 });
		const taskB = createFocusTask({ title: 'Secondary Task', order: 1 });
		const repo = new MockTaskRepository([taskA, taskB]);
		const tasksState = createTasksState(repo);
		await tasksState.load();

		const screen = await render(PlanningView, { tasksState });

		// Initially neither task is pinned
		expect(tasksState.activeTaskId).toBeNull();
		const pinBtnA = screen.getByRole('button', {
			name: `Set as active in timer "${taskA.title}"`
		});
		await expect.element(pinBtnA).toHaveAttribute('aria-pressed', 'false');

		// Click to pin taskA
		await pinBtnA.click();
		expect(tasksState.activeTaskId).toBe(taskA.id);
		await expect
			.element(screen.getByRole('button', { name: `Unset active task "${taskA.title}"` }))
			.toHaveAttribute('aria-pressed', 'true');

		// Click again to unpin taskA
		const unpinBtnA = screen.getByRole('button', {
			name: `Unset active task "${taskA.title}"`
		});
		await unpinBtnA.click();
		expect(tasksState.activeTaskId).toBeNull();
		await expect
			.element(screen.getByRole('button', { name: `Set as active in timer "${taskA.title}"` }))
			.toHaveAttribute('aria-pressed', 'false');
	});

	it('deletes a pending task when clicking delete button', async () => {
		const task = createFocusTask({ title: 'Task to discard' });
		const repo = new MockTaskRepository([task]);
		const tasksState = createTasksState(repo);
		await tasksState.load();
		tasksState.setActiveTask(task.id);

		const screen = await render(PlanningView, { tasksState });

		const deleteBtn = screen.getByRole('button', { name: `Delete task "${task.title}"` });
		await expect.element(deleteBtn).toBeVisible();
		await deleteBtn.click();

		await expect
			.element(screen.getByText('No pending tasks. Add one to plan your session.'))
			.toBeVisible();
		expect(tasksState.pendingTasks.length).toBe(0);
		expect(tasksState.activeTaskId).toBeNull();
	});

	it('allows inline editing of task title', async () => {
		const task = createFocusTask({ title: 'Initial Title' });
		const repo = new MockTaskRepository([task]);
		const tasksState = createTasksState(repo);
		await tasksState.load();

		const screen = await render(PlanningView, { tasksState });

		const titleBtn = screen.getByRole('button', { name: `Edit task "${task.title}"` });
		await expect.element(titleBtn).toBeVisible();
		await titleBtn.click();

		// Inline input appears
		const editInput = screen.getByRole('textbox', { name: 'Edit task title' });
		await expect.element(editInput).toBeVisible();

		// Type new title and press Enter
		await editInput.fill('Updated Title');
		await userEvent.keyboard('{Enter}');

		await expect.element(screen.getByText('Updated Title')).toBeVisible();
		expect(tasksState.pendingTasks[0].title).toBe('Updated Title');
	});

	it('cancels inline editing when pressing Escape', async () => {
		const task = createFocusTask({ title: 'Keep Title' });
		const repo = new MockTaskRepository([task]);
		const tasksState = createTasksState(repo);
		await tasksState.load();

		const screen = await render(PlanningView, { tasksState });

		const titleBtn = screen.getByRole('button', { name: `Edit task "${task.title}"` });
		await titleBtn.click();

		const editInput = screen.getByRole('textbox', { name: 'Edit task title' });
		await editInput.fill('Discarded Change');
		await userEvent.keyboard('{Escape}');

		await expect.element(screen.getByText('Keep Title')).toBeVisible();
		expect(tasksState.pendingTasks[0].title).toBe('Keep Title');
	});

	it('toggles collapse of completed tasks list', async () => {
		const completedTask = toggleFocusTask(createFocusTask({ title: 'Already Finished Task' }));
		const repo = new MockTaskRepository([completedTask]);
		const tasksState = createTasksState(repo);
		await tasksState.load();

		const screen = await render(PlanningView, { tasksState });

		await expect.element(screen.getByText('Already Finished Task')).toBeVisible();

		const collapseBtn = screen.getByRole('button', { name: /Completed \(1\)/i });
		await expect.element(collapseBtn).toHaveAttribute('aria-expanded', 'true');

		// Click to collapse
		await collapseBtn.click();
		await expect.element(collapseBtn).toHaveAttribute('aria-expanded', 'false');
		await expect.element(screen.getByText('Already Finished Task')).not.toBeInTheDocument();

		// Click to expand
		await collapseBtn.click();
		await expect.element(collapseBtn).toHaveAttribute('aria-expanded', 'true');
		await expect.element(screen.getByText('Already Finished Task')).toBeVisible();
	});

	it('clears all completed tasks when clicking "Clear completed"', async () => {
		const completedTask1 = toggleFocusTask(
			createFocusTask({ title: 'Completed 1' }),
			Date.now() - 1000
		);
		const completedTask2 = toggleFocusTask(createFocusTask({ title: 'Completed 2' }), Date.now());
		const repo = new MockTaskRepository([completedTask1, completedTask2]);
		const tasksState = createTasksState(repo);
		await tasksState.load();

		const screen = await render(PlanningView, { tasksState });

		await expect.element(screen.getByText('Completed (2)')).toBeVisible();

		const clearBtn = screen.getByRole('button', { name: 'Clear completed' });
		await expect.element(clearBtn).toBeVisible();
		await clearBtn.click();

		await expect
			.element(screen.getByRole('button', { name: 'Clear completed' }))
			.not.toBeInTheDocument();
		expect(tasksState.completedTasks.length).toBe(0);
	});

	it('navigates back to timer when clicking "Back to timer" button', async () => {
		const repo = new MockTaskRepository();
		const tasksState = createTasksState(repo);
		await tasksState.load();
		const navigationState = createNavigationState('planning');

		const screen = await render(PlanningView, { tasksState, navigationState });

		const timerNavBtn = screen.getByRole('button', { name: 'Back to timer' });
		await expect.element(timerNavBtn).toBeVisible();
		await timerNavBtn.click();

		expect(navigationState.activeTab).toBe('timer');
	});

	it('renders timeline with planningState and 3-metric strip summary display', async () => {
		const repo = new MockTaskRepository();
		const tasksState = createTasksState(repo);
		const planRepo = new MockSessionPlanRepository();
		const timerState = createTimerState();
		const planningState = createPlanningState(planRepo, timerState, tasksState);
		await tasksState.load();
		await planningState.load();

		const screen = await render(PlanningView, { tasksState, planningState, timerState });

		await expect.element(screen.getByText('Session Timeline')).toBeVisible();
		await expect.element(screen.getByText('Total Focus')).toBeVisible();
		await expect.element(screen.getByText('Total Breaks')).toBeVisible();
		await expect.element(screen.getByText('Estimated Finish')).toBeVisible();

		// Default values: 4 blocks x 25m = 100m -> 1h 40m, breaks: 3 * 5m = 15m
		await expect.element(screen.getByText('1h 40m')).toBeVisible();
		await expect.element(screen.getByText('15m').nth(1)).toBeVisible();
	});

	it('toggles mode between By Blocks and By End Time', async () => {
		const repo = new MockTaskRepository();
		const tasksState = createTasksState(repo);
		const planRepo = new MockSessionPlanRepository();
		const timerState = createTimerState();
		const planningState = createPlanningState(planRepo, timerState, tasksState);
		await tasksState.load();
		await planningState.load();

		const screen = await render(PlanningView, { tasksState, planningState, timerState });

		expect(planningState.targetMode).toBe('blocks');

		const byEndTimeBtn = screen.getByRole('button', { name: 'By End Time' });
		await byEndTimeBtn.click();
		expect(planningState.targetMode).toBe('end_time');

		// Target finish time input should be visible
		await expect.element(screen.getByLabelText('Target finish time')).toBeVisible();

		const byBlocksBtn = screen.getByRole('button', { name: 'By Blocks' });
		await byBlocksBtn.click();
		expect(planningState.targetMode).toBe('blocks');
	});

	it('adjusts focus duration and block count via steppers', async () => {
		const repo = new MockTaskRepository();
		const tasksState = createTasksState(repo);
		const planRepo = new MockSessionPlanRepository();
		const timerState = createTimerState();
		const planningState = createPlanningState(planRepo, timerState, tasksState);
		await tasksState.load();
		await planningState.load();

		const screen = await render(PlanningView, { tasksState, planningState, timerState });

		// Increase focus duration by 5m
		const incFocusBtn = screen.getByRole('button', { name: 'Increase focus duration' });
		await incFocusBtn.click();
		expect(planningState.focusMinutes).toBe(30);

		// Decrease block count by 1
		const decBlockBtn = screen.getByRole('button', { name: 'Decrease block count' });
		await decBlockBtn.click();
		expect(planningState.blockCount).toBe(3);
	});

	it('slots task into block via popover and unassigns it', async () => {
		const task = createFocusTask({ title: 'Task to Assign' });
		const repo = new MockTaskRepository([task]);
		const tasksState = createTasksState(repo);
		const planRepo = new MockSessionPlanRepository();
		const timerState = createTimerState();
		const planningState = createPlanningState(planRepo, timerState, tasksState);
		await tasksState.load();
		await planningState.load();

		const screen = await render(PlanningView, { tasksState, planningState, timerState });

		// Click "Assign task" for Focus Block 1
		const assignBtn = screen.getByRole('button', { name: 'Assign task to focus block 1' });
		await assignBtn.click();

		// Select task inside popover using its accessible label
		const taskChoiceBtn = screen.getByRole('button', {
			name: 'Assign task: Task to Assign'
		});
		await taskChoiceBtn.click();

		// Block 1 should now show assigned task in the Session Timeline
		const planningSection = screen.getByRole('region', { name: 'Session Planning' });
		await expect.element(planningSection.getByText('Task to Assign')).toBeVisible();
		expect(planningState.draftTaskAssignments.get(0)).toBe(task.id);

		// Unassign task
		const unassignBtn = screen.getByRole('button', {
			name: 'Unassign task from focus block 1'
		});
		await unassignBtn.click();
		expect(planningState.draftTaskAssignments.has(0)).toBe(false);
	});

	it('slots task into next available focus block from backlog', async () => {
		const task = createFocusTask({ title: 'Backlog Quick Slot Task' });
		const repo = new MockTaskRepository([task]);
		const tasksState = createTasksState(repo);
		const planRepo = new MockSessionPlanRepository();
		const timerState = createTimerState();
		const planningState = createPlanningState(planRepo, timerState, tasksState);
		await tasksState.load();
		await planningState.load();

		const screen = await render(PlanningView, { tasksState, planningState, timerState });

		const quickSlotBtn = screen.getByRole('button', {
			name: 'Slot task "Backlog Quick Slot Task" into next focus block'
		});
		await quickSlotBtn.click();

		expect(planningState.draftTaskAssignments.get(0)).toBe(task.id);
	});

	it('starts session and navigates to timer tab when clicking Start Session', async () => {
		const repo = new MockTaskRepository();
		const tasksState = createTasksState(repo);
		const planRepo = new MockSessionPlanRepository();
		const timerState = createTimerState();
		const planningState = createPlanningState(planRepo, timerState, tasksState);
		const navigationState = createNavigationState('planning');
		await tasksState.load();
		await planningState.load();

		const screen = await render(PlanningView, {
			tasksState,
			planningState,
			timerState,
			navigationState
		});

		const startBtn = screen.getByRole('button', { name: 'Start Session' });
		await expect.element(startBtn).toBeVisible();
		await startBtn.click();

		expect(planningState.isSessionActive).toBe(true);
		expect(navigationState.activeTab).toBe('timer');
	});

	it('renders active session controls and ends session', async () => {
		const repo = new MockTaskRepository();
		const tasksState = createTasksState(repo);
		const planRepo = new MockSessionPlanRepository();
		const timerState = createTimerState();
		const planningState = createPlanningState(planRepo, timerState, tasksState);
		const navigationState = createNavigationState('planning');
		await tasksState.load();
		await planningState.load();
		await planningState.startSession(timerState, tasksState);

		const screen = await render(PlanningView, {
			tasksState,
			planningState,
			timerState,
			navigationState
		});

		// Forward-only notice
		await expect.element(screen.getByText('Forward-only sync:')).toBeVisible();

		// End session plan
		const endBtn = screen.getByRole('button', { name: 'End Session Plan' });
		await expect.element(endBtn).toBeVisible();
		await endBtn.click();

		expect(planningState.isSessionActive).toBe(false);
	});

	it('keeps duration steppers enabled and allows updating durations during an active session', async () => {
		const repo = new MockTaskRepository();
		const tasksState = createTasksState(repo);
		const planRepo = new MockSessionPlanRepository();
		const timerState = createTimerState();
		const planningState = createPlanningState(planRepo, timerState, tasksState);
		const navigationState = createNavigationState('planning');
		await tasksState.load();
		await planningState.load();
		await planningState.startSession(timerState, tasksState);

		expect(planningState.isSessionActive).toBe(true);

		const screen = await render(PlanningView, {
			tasksState,
			planningState,
			timerState,
			navigationState
		});

		// Duration steppers should be enabled
		const incFocusBtn = screen.getByRole('button', { name: 'Increase focus duration' });
		const decFocusBtn = screen.getByRole('button', { name: 'Decrease focus duration' });
		const incShortBreakBtn = screen.getByRole('button', { name: 'Increase short break duration' });
		const decShortBreakBtn = screen.getByRole('button', { name: 'Decrease short break duration' });
		const incLongBreakBtn = screen.getByRole('button', { name: 'Increase long break duration' });
		const decLongBreakBtn = screen.getByRole('button', { name: 'Decrease long break duration' });
		const incIntervalBtn = screen.getByRole('button', { name: 'Increase long break interval' });
		const decIntervalBtn = screen.getByRole('button', { name: 'Decrease long break interval' });

		await expect.element(incFocusBtn).not.toBeDisabled();
		await expect.element(decFocusBtn).not.toBeDisabled();
		await expect.element(incShortBreakBtn).not.toBeDisabled();
		await expect.element(decShortBreakBtn).not.toBeDisabled();
		await expect.element(incLongBreakBtn).not.toBeDisabled();
		await expect.element(decLongBreakBtn).not.toBeDisabled();
		await expect.element(incIntervalBtn).not.toBeDisabled();
		await expect.element(decIntervalBtn).not.toBeDisabled();

		// Structural block count steppers should remain disabled
		const incBlockBtn = screen.getByRole('button', { name: 'Increase block count' });
		const decBlockBtn = screen.getByRole('button', { name: 'Decrease block count' });
		await expect.element(incBlockBtn).toBeDisabled();
		await expect.element(decBlockBtn).toBeDisabled();

		// Test clicking duration steppers updates state forward-only
		const initialFocus = planningState.focusMinutes;
		await incFocusBtn.click();
		expect(planningState.focusMinutes).toBe(initialFocus + 5);

		const initialShortBreak = planningState.shortBreakMinutes;
		await incShortBreakBtn.click();
		expect(planningState.shortBreakMinutes).toBe(initialShortBreak + 1);

		const initialLongBreak = planningState.longBreakMinutes;
		await incLongBreakBtn.click();
		expect(planningState.longBreakMinutes).toBe(initialLongBreak + 5);

		const initialInterval = planningState.longBreakInterval;
		await incIntervalBtn.click();
		expect(planningState.longBreakInterval).toBe(initialInterval + 1);
	});
});
