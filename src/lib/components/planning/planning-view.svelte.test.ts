import { describe, it, expect } from 'vitest';
import { render } from 'vitest-browser-svelte';
import { userEvent } from 'vitest/browser';
import PlanningView from './planning-view.svelte';
import { createTasksState } from '$lib/state/tasks.svelte';
import { createNavigationState } from '$lib/state/navigation.svelte';
import { createPlanningState } from '$lib/state/planning.svelte';
import { createTimerState } from '$lib/state/timer.svelte';
import { createFocusTask, toggleFocusTask } from '$lib/domain/tasks/task.entity';
import { createBreaksState } from '$lib/state/breaks.svelte';
import { createBreakActivity } from '$lib/domain/breaks/break-activity.entity';
import { localeState } from '$lib/state/locale.svelte';
import { FakeTaskRepository } from '$tests/fakes/repositories/fake-task-repository';
import { FakeSessionPlanRepository } from '$tests/fakes/repositories/fake-session-plan-repository';
import { FakeBreakActivityRepository } from '$tests/fakes/repositories/fake-break-activity-repository';

describe('PlanningView (Client Browser)', () => {
	it('renders header, quick task input and empty state when backlog is empty', async () => {
		const repo = new FakeTaskRepository();
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
		const repo = new FakeTaskRepository();
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
		const repo = new FakeTaskRepository();
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
		const repo = new FakeTaskRepository([task]);
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
		const repo = new FakeTaskRepository([taskA, taskB]);
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
		const repo = new FakeTaskRepository([task]);
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
		const repo = new FakeTaskRepository([task]);
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
		const repo = new FakeTaskRepository([task]);
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
		const repo = new FakeTaskRepository([completedTask]);
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
		const repo = new FakeTaskRepository([completedTask1, completedTask2]);
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
		const repo = new FakeTaskRepository();
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
		const repo = new FakeTaskRepository();
		const tasksState = createTasksState(repo);
		const planRepo = new FakeSessionPlanRepository();
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
		await expect.element(screen.getByText('15m')).toBeVisible();
	});

	it('toggles mode between By Blocks and By End Time', async () => {
		const repo = new FakeTaskRepository();
		const tasksState = createTasksState(repo);
		const planRepo = new FakeSessionPlanRepository();
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

	it('adjusts focus duration and block count via presets and progressive disclosure steppers', async () => {
		const repo = new FakeTaskRepository();
		const tasksState = createTasksState(repo);
		const planRepo = new FakeSessionPlanRepository();
		const timerState = createTimerState();
		const planningState = createPlanningState(planRepo, timerState, tasksState);
		await tasksState.load();
		await planningState.load();

		const screen = await render(PlanningView, { tasksState, planningState, timerState });

		// Select 50/10 Foco Profundo preset chip
		const deepFocusBtn = screen.getByRole('button', { name: /50\/10/i });
		await deepFocusBtn.click();
		expect(planningState.focusMinutes).toBe(50);
		expect(planningState.shortBreakMinutes).toBe(10);

		// Switch back to 25/5 Clásico preset chip
		const classicBtn = screen.getByRole('button', { name: /25\/5/i });
		await classicBtn.click();
		expect(planningState.focusMinutes).toBe(25);
		expect(planningState.shortBreakMinutes).toBe(5);

		// Expand progressive disclosure panel
		const customizeBtn = screen.getByRole('button', { name: 'Customize cadence' });
		await customizeBtn.click();

		// Increase focus duration by 5m via manual stepper
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
		const repo = new FakeTaskRepository([task]);
		const tasksState = createTasksState(repo);
		const planRepo = new FakeSessionPlanRepository();
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
		const repo = new FakeTaskRepository([task]);
		const tasksState = createTasksState(repo);
		const planRepo = new FakeSessionPlanRepository();
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
		const repo = new FakeTaskRepository();
		const tasksState = createTasksState(repo);
		const planRepo = new FakeSessionPlanRepository();
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

	it('renders active session controls and confirms ending session via alert dialog (UX-02)', async () => {
		const repo = new FakeTaskRepository();
		const tasksState = createTasksState(repo);
		const planRepo = new FakeSessionPlanRepository();
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

		// Click End Session Plan trigger
		const endBtn = screen.getByRole('button', { name: 'End Session Plan' });
		await expect.element(endBtn).toBeVisible();
		await endBtn.click();

		// Alert dialog should open with title, description, and action buttons
		await expect.element(screen.getByText('End Active Session?')).toBeVisible();
		await expect
			.element(
				screen.getByText(
					'This will cancel your ongoing session plan, clear block progression, and reset the active timer.'
				)
			)
			.toBeVisible();

		// Cancel button dismisses dialog without ending session
		const cancelBtn = screen.getByRole('button', { name: 'Cancel' });
		await expect.element(cancelBtn).toBeVisible();
		await cancelBtn.click();

		expect(planningState.isSessionActive).toBe(true);

		// Click End Session Plan trigger again and confirm
		await endBtn.click();
		const confirmBtn = screen.getByRole('button', { name: 'End Session', exact: true });
		await expect.element(confirmBtn).toBeVisible();
		await confirmBtn.click();

		expect(planningState.isSessionActive).toBe(false);
	});

	it('displays quick recovery button when time window is insufficient and adjusts to minimum viable window (UX-01)', async () => {
		const repo = new FakeTaskRepository();
		const tasksState = createTasksState(repo);
		const planRepo = new FakeSessionPlanRepository();
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

		// Switch to By End Time mode
		const byEndTimeBtn = screen.getByRole('button', { name: 'By End Time' });
		await byEndTimeBtn.click();
		expect(planningState.targetMode).toBe('end_time');

		// Set scheduled start and tight target finish time (10 min < 25 min focus)
		planningState.setScheduledStartTime('10:00');
		planningState.setFocusMinutes(25);
		planningState.setTargetEndTime('10:10');

		// Underflow alert should be visible with quick recovery button
		await expect
			.element(screen.getByText('Time window is too short for a full focus block.'))
			.toBeVisible();
		const adjustBtn = screen.getByRole('button', { name: /Adjust to minimum/i });
		await expect.element(adjustBtn).toBeVisible();

		// Clicking recovery button auto-adjusts target end time to fit at least 1 focus block
		await adjustBtn.click();

		expect(planningState.projectedPlan.blocks.length).toBeGreaterThanOrEqual(1);
		await expect
			.element(screen.getByText('Time window is too short for a full focus block.'))
			.not.toBeInTheDocument();
	});

	it('keeps duration steppers enabled and allows updating durations during an active session', async () => {
		const repo = new FakeTaskRepository();
		const tasksState = createTasksState(repo);
		const planRepo = new FakeSessionPlanRepository();
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

		// Expand progressive disclosure panel to access manual duration steppers
		const customizeBtn = screen.getByRole('button', { name: 'Customize cadence' });
		await customizeBtn.click();

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

	it('renders timeline track as semantic ordered list and marks active step with aria-current (UX-08 & UX-10)', async () => {
		const repo = new FakeTaskRepository();
		const tasksState = createTasksState(repo);
		const planRepo = new FakeSessionPlanRepository();
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

		// Timeline track is an ordered list with proper label
		const timelineList = screen.getByRole('list', { name: 'Planned session sequence' });
		await expect.element(timelineList).toBeVisible();

		// Start session so block 0 is in_progress
		await planningState.startSession(timerState, tasksState);

		// Active step should have aria-current="step"
		const activeStep = timelineList.element().querySelector('li[aria-current="step"]');
		expect(activeStep).not.toBeNull();

		// Active block shows dynamic progress bar (UX-10)
		await expect
			.element(screen.getByRole('progressbar', { name: 'Focus block progress' }))
			.toBeInTheDocument();
		await expect.element(screen.getByText('Active block')).toBeInTheDocument();
	});

	it('displays +1 day badge when finish time crosses midnight in end-time mode (UX-08)', async () => {
		const repo = new FakeTaskRepository();
		const tasksState = createTasksState(repo);
		const planRepo = new FakeSessionPlanRepository();
		const timerState = createTimerState();
		const planningState = createPlanningState(planRepo, timerState, tasksState);
		const navigationState = createNavigationState('planning');
		await tasksState.load();
		await planningState.load();

		planningState.setTargetMode('end_time');
		planningState.setScheduledStartTime('23:30');
		planningState.setTargetEndTime('01:30');

		const screen = await render(PlanningView, {
			tasksState,
			planningState,
			timerState,
			navigationState
		});

		const badge = screen.getByText('+1 day').first();
		await expect.element(badge).toBeVisible();
	});

	it('allows quick task creation and assignment directly from the popover (UX-03)', async () => {
		const repo = new FakeTaskRepository();
		const tasksState = createTasksState(repo);
		const planRepo = new FakeSessionPlanRepository();
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

		// Initially backlog is empty
		expect(tasksState.tasks.length).toBe(0);

		// Open popover for focus block 1
		const assignBtn = screen.getByRole('button', { name: 'Assign task to focus block 1' });
		await assignBtn.click();

		// Quick search/add input should be visible
		const quickInput = screen.getByRole('textbox', {
			name: 'Search or create task for Focus Block 1'
		});
		await expect.element(quickInput).toBeVisible();

		// Type a new task title and submit
		await quickInput.fill('Implement auth tokens');
		await userEvent.keyboard('{Enter}');

		// Task should be created in tasksState and assigned to block 0
		expect(tasksState.tasks.length).toBe(1);
		expect(tasksState.tasks[0].title).toBe('Implement auth tokens');
		expect(planningState.projectedPlan.blocks[0].assignedTaskId).toBe(tasksState.tasks[0].id);
	});

	it('assigns task to timeline focus block via drag and drop (UX-04)', async () => {
		const repo = new FakeTaskRepository();
		const tasksState = createTasksState(repo);
		const planRepo = new FakeSessionPlanRepository();
		const timerState = createTimerState();
		const planningState = createPlanningState(planRepo, timerState, tasksState);
		const navigationState = createNavigationState('planning');
		await tasksState.load();
		await planningState.load();

		const task = await tasksState.createTask('Write integration tests');

		const screen = await render(PlanningView, {
			tasksState,
			planningState,
			timerState,
			navigationState
		});

		// Find the timeline block list item for focus block 1
		const blockItem = screen
			.getByRole('list', { name: 'Planned session sequence' })
			.element()
			.querySelector('li');
		expect(blockItem).not.toBeNull();

		// Dispatch drop event with task id
		const dataTransfer = new DataTransfer();
		dataTransfer.setData('application/x-pomody-task-id', task.id);
		const dropEvent = new DragEvent('drop', {
			bubbles: true,
			cancelable: true,
			dataTransfer
		});
		blockItem?.dispatchEvent(dropEvent);

		// The block should now be assigned to that task
		expect(planningState.projectedPlan.blocks[0].assignedTaskId).toBe(task.id);
	});

	it('focuses new task backlog input via keyboard shortcut (UX-04)', async () => {
		const repo = new FakeTaskRepository();
		const tasksState = createTasksState(repo);
		const planRepo = new FakeSessionPlanRepository();
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

		const backlogInput = screen.getByRole('textbox', {
			name: 'Add a new focus task... (Enter to add)'
		});

		// Press 'n' to trigger focus
		await userEvent.keyboard('n');
		await expect.element(backlogInput).toHaveFocus();
	});

	describe('Segment Switching (Tasks vs Break Habits)', () => {
		it('defaults right column to TaskBacklog and highlights Tasks segment', async () => {
			const repo = new FakeTaskRepository();
			const tasksState = createTasksState(repo);
			const breaksRepo = new FakeBreakActivityRepository();
			const breaksState = createBreaksState(breaksRepo);
			await tasksState.load();
			await breaksState.load();

			const screen = await render(PlanningView, { tasksState, breaksState });

			const tasksSegment = screen.getByRole('radio', { name: /Tasks/i });
			const breaksSegment = screen.getByRole('radio', { name: /Break Habits/i });

			await expect.element(tasksSegment).toBeVisible();
			await expect.element(breaksSegment).toBeVisible();
			expect(tasksSegment.element().getAttribute('aria-checked')).toBe('true');
			expect(breaksSegment.element().getAttribute('aria-checked')).toBe('false');

			await expect.element(screen.getByText('Tasks Backlog')).toBeVisible();
			await expect
				.element(screen.getByText('No pending tasks. Add one to plan your session.'))
				.toBeVisible();
			await expect
				.element(screen.getByRole('group', { name: 'Filter activities by category' }))
				.not.toBeInTheDocument();
		});

		it('switches to BreakCatalog when clicking Break Habits segment and back to TaskBacklog', async () => {
			const task = createFocusTask({ title: 'Important Feature Task' });
			const tasksRepo = new FakeTaskRepository([task]);
			const tasksState = createTasksState(tasksRepo);

			const habit = createBreakActivity({
				id: 'break-habit-1',
				title: 'Hydration Sip & Stretch',
				category: 'hydration',
				durationMinutes: 2,
				isPreset: true
			});
			const breaksRepo = new FakeBreakActivityRepository([habit]);
			const breaksState = createBreaksState(breaksRepo);

			await tasksState.load();
			await breaksState.load();

			const screen = await render(PlanningView, { tasksState, breaksState });

			// Initial state: Tasks Backlog is visible
			await expect.element(screen.getByText('Important Feature Task')).toBeVisible();
			await expect.element(screen.getByText('Hydration Sip & Stretch')).not.toBeInTheDocument();

			// Click 'Break Habits' segment
			const breaksSegment = screen.getByRole('radio', { name: /Break Habits/i });
			await breaksSegment.click();

			// Now BreakCatalog is visible
			expect(breaksSegment.element().getAttribute('aria-checked')).toBe('true');
			await expect.element(screen.getByText('Hydration Sip & Stretch')).toBeVisible();
			await expect.element(screen.getByText('Important Feature Task')).not.toBeInTheDocument();

			// Click 'Tasks' segment to switch back
			const tasksSegment = screen.getByRole('radio', { name: /Tasks/i });
			await tasksSegment.click();

			// Tasks Backlog is restored
			expect(tasksSegment.element().getAttribute('aria-checked')).toBe('true');
			await expect.element(screen.getByText('Important Feature Task')).toBeVisible();
			await expect.element(screen.getByText('Hydration Sip & Stretch')).not.toBeInTheDocument();
		});

		it('preserves left column timeline visibility and interaction during segment switching', async () => {
			const tasksRepo = new FakeTaskRepository();
			const tasksState = createTasksState(tasksRepo);
			const planRepo = new FakeSessionPlanRepository();
			const timerState = createTimerState();
			const planningState = createPlanningState(planRepo, timerState, tasksState);
			const breaksRepo = new FakeBreakActivityRepository();
			const breaksState = createBreaksState(breaksRepo);

			await tasksState.load();
			await planningState.load();
			await breaksState.load();

			const screen = await render(PlanningView, {
				tasksState,
				planningState,
				timerState,
				breaksState
			});

			// Timeline is rendered in left column
			const timelineHeading = screen.getByText('Session Timeline');
			await expect.element(timelineHeading).toBeVisible();
			await expect.element(screen.getByText('Total Focus')).toBeVisible();

			// Switch to Break Habits
			const breaksSegment = screen.getByRole('radio', { name: /Break Habits/i });
			await breaksSegment.click();

			// Timeline in left column remains visible and functional
			await expect.element(timelineHeading).toBeVisible();
			await expect.element(screen.getByText('Total Focus')).toBeVisible();

			// Switch back to Tasks
			const tasksSegment = screen.getByRole('radio', { name: /Tasks/i });
			await tasksSegment.click();

			// Timeline is still intact
			await expect.element(timelineHeading).toBeVisible();
			await expect.element(screen.getByText('Total Focus')).toBeVisible();
		});

		it('switches segment to breaks via "b" keyboard shortcut and returns to tasks via "c" or "n"', async () => {
			const task = createFocusTask({ title: 'Important Feature Task' });
			const tasksRepo = new FakeTaskRepository([task]);
			const tasksState = createTasksState(tasksRepo);

			const habit = createBreakActivity({
				id: 'break-habit-1',
				title: 'Hydration Sip & Stretch',
				category: 'hydration',
				durationMinutes: 2,
				isPreset: true
			});
			const breaksRepo = new FakeBreakActivityRepository([habit]);
			const breaksState = createBreaksState(breaksRepo);

			await tasksState.load();
			await breaksState.load();

			const screen = await render(PlanningView, { tasksState, breaksState });

			const tasksSegment = screen.getByRole('radio', { name: /Tasks/i });
			const breaksSegment = screen.getByRole('radio', { name: /Break Habits/i });

			// Initial state: Tasks Backlog is visible
			expect(tasksSegment.element().getAttribute('aria-checked')).toBe('true');
			expect(breaksSegment.element().getAttribute('aria-checked')).toBe('false');
			await expect.element(screen.getByText('Important Feature Task')).toBeVisible();

			// Press 'b' to switch to break habits
			await userEvent.keyboard('b');

			expect(breaksSegment.element().getAttribute('aria-checked')).toBe('true');
			expect(tasksSegment.element().getAttribute('aria-checked')).toBe('false');
			await expect.element(screen.getByText('Hydration Sip & Stretch')).toBeVisible();
			await expect.element(screen.getByText('Important Feature Task')).not.toBeInTheDocument();

			// Press 'c' to switch back to tasks (which focuses new-task-input)
			await userEvent.keyboard('c');

			expect(tasksSegment.element().getAttribute('aria-checked')).toBe('true');
			expect(breaksSegment.element().getAttribute('aria-checked')).toBe('false');
			await expect.element(screen.getByText('Important Feature Task')).toBeVisible();
			await expect.element(screen.getByText('Hydration Sip & Stretch')).not.toBeInTheDocument();

			// Verify input guard: pressing 'b' while input is focused does not switch segment
			const input = document.getElementById('new-task-input') as HTMLInputElement | null;
			expect(input).not.toBeNull();
			await userEvent.keyboard('b');
			expect(tasksSegment.element().getAttribute('aria-checked')).toBe('true');

			// Blur input so global shortcut is enabled again
			input?.blur();

			// Press 'b' again to switch to breaks
			await userEvent.keyboard('b');
			expect(breaksSegment.element().getAttribute('aria-checked')).toBe('true');
			expect(tasksSegment.element().getAttribute('aria-checked')).toBe('false');

			// Press 'n' to switch back to tasks
			await userEvent.keyboard('n');
			expect(tasksSegment.element().getAttribute('aria-checked')).toBe('true');
			await expect.element(screen.getByText('Important Feature Task')).toBeVisible();
		});
	});

	describe('Localization', () => {
		it('localizes planning view and session timeline reactively in Spanish', async () => {
			localeState.setLocale('es');

			const tasksRepo = new FakeTaskRepository();
			const tasksState = createTasksState(tasksRepo);
			const planRepo = new FakeSessionPlanRepository();
			const timerState = createTimerState();
			const planningState = createPlanningState(planRepo, timerState, tasksState);
			const breaksRepo = new FakeBreakActivityRepository();
			const breaksState = createBreaksState(breaksRepo);
			const navigationState = createNavigationState('planning');

			await tasksState.load();
			await planningState.load();
			await breaksState.load();

			const screen = await render(PlanningView, {
				tasksState,
				planningState,
				timerState,
				breaksState,
				navigationState
			});

			// Heading and subtitle
			await expect.element(screen.getByRole('heading', { name: 'Planificación' })).toBeVisible();
			await expect.element(screen.getByText('0 tareas pendientes')).toBeVisible();

			// Back to timer
			await expect
				.element(screen.getByRole('button', { name: 'Volver al temporizador' }))
				.toBeVisible();

			// Segment tabs: "Tareas", "Hábitos de descanso"
			await expect.element(screen.getByRole('radio', { name: /Tareas/i })).toBeVisible();
			await expect
				.element(screen.getByRole('radio', { name: /Hábitos de descanso/i }))
				.toBeVisible();

			// Timeline heading
			await expect.element(screen.getByText('Cronograma de sesión')).toBeVisible();

			// Timeline mode buttons
			await expect.element(screen.getByRole('button', { name: 'Por bloques' })).toBeVisible();
			await expect.element(screen.getByRole('button', { name: 'Por hora final' })).toBeVisible();

			// Summary metrics
			await expect.element(screen.getByText('Foco total')).toBeVisible();
			await expect.element(screen.getByText('Descanso total')).toBeVisible();
			await expect.element(screen.getByText('Final estimado')).toBeVisible();

			// Focus card title
			await expect.element(screen.getByText('Bloque de foco').first()).toBeVisible();

			// Empty focus slot
			await expect.element(screen.getByText('Sin asignar · Foco libre').first()).toBeVisible();

			// Assign task button
			await expect
				.element(screen.getByRole('button', { name: 'Asignar tarea' }).first())
				.toBeVisible();

			// Start session CTA
			await expect.element(screen.getByRole('button', { name: 'Iniciar sesión' })).toBeVisible();
		});
	});
});
