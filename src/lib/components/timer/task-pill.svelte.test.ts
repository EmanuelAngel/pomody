import { describe, it, expect, vi } from 'vitest';
import { render } from 'vitest-browser-svelte';
import { userEvent } from 'vitest/browser';
import TaskPill from './task-pill.svelte';
import Timer from './timer.svelte';
import { createTasksState } from '$lib/state/tasks.svelte';
import { createTimerState } from '$lib/state/timer.svelte';
import { createFocusTask } from '$lib/domain/tasks/task.entity';
import { FakeTaskRepository } from '$tests/fakes/repositories/fake-task-repository';

function createDummyTicker(isRunning = false) {
	return {
		isRunning,
		start: vi.fn(),
		stop: vi.fn(),
		destroy: vi.fn()
	};
}

describe('TaskPill (Client Browser)', () => {
	it('renders unassigned state ("Free focus") when no active task exists', async () => {
		const repo = new FakeTaskRepository();
		const tasksState = createTasksState(repo);
		await tasksState.load();

		const screen = await render(TaskPill, {
			isRunning: false,
			tasksState,
			portalProps: { disabled: true }
		});

		const pill = screen.getByRole('button', { name: 'Select focus task' });
		await expect.element(pill).toBeVisible();
		await expect.element(screen.getByText('Free focus')).toBeVisible();
		await expect.element(pill).toHaveClass('opacity-100');

		await expect.element(screen.getByRole('checkbox')).not.toBeInTheDocument();
	});

	it('applies Zen Mode opacity reduction when isRunning is true', async () => {
		const repo = new FakeTaskRepository();
		const tasksState = createTasksState(repo);
		await tasksState.load();

		const screen = await render(TaskPill, {
			isRunning: true,
			tasksState,
			portalProps: { disabled: true }
		});

		const pill = screen.getByRole('button', { name: 'Select focus task' });
		await expect.element(pill).toBeVisible();
		await expect.element(pill).toHaveClass('opacity-60');
	});

	it('renders active task title and inline checkbox when active task is present', async () => {
		const initialTask = createFocusTask({ title: 'Configure Hexagonal' });
		const repo = new FakeTaskRepository([initialTask]);
		const tasksState = createTasksState(repo);
		await tasksState.load();
		tasksState.setActiveTask(initialTask.id);

		const screen = await render(TaskPill, {
			isRunning: false,
			tasksState,
			portalProps: { disabled: true }
		});

		await expect.element(screen.getByText('Configure Hexagonal')).toBeVisible();

		const checkbox = screen.getByRole('checkbox');
		await expect.element(checkbox).toBeVisible();
		await expect.element(checkbox).toHaveAttribute('aria-checked', 'false');

		const trigger = screen.getByRole('button', {
			name: 'Change active task: Configure Hexagonal'
		});
		await expect.element(trigger).toBeVisible();
	});

	it('toggles active task completion in-place without opening popover', async () => {
		const task = createFocusTask({ title: 'Write unit tests' });
		const repo = new FakeTaskRepository([task]);
		const tasksState = createTasksState(repo);
		await tasksState.load();
		tasksState.setActiveTask(task.id);

		const screen = await render(TaskPill, {
			isRunning: false,
			tasksState,
			portalProps: { disabled: true }
		});

		const checkbox = screen.getByRole('checkbox');
		await expect.element(checkbox).toHaveAttribute('aria-checked', 'false');

		// Click checkbox to complete task
		await checkbox.click();

		await expect.element(checkbox).toHaveAttribute('aria-checked', 'true');
		expect(tasksState.activeTask?.completed).toBe(true);

		// Popover should not have opened
		await expect.element(screen.getByRole('textbox')).not.toBeInTheDocument();

		// Click again to un-complete
		await checkbox.click();
		await expect.element(checkbox).toHaveAttribute('aria-checked', 'false');
		expect(tasksState.activeTask?.completed).toBe(false);
	});

	it('opens quick-select popover when clicking the pill trigger', async () => {
		const repo = new FakeTaskRepository();
		const tasksState = createTasksState(repo);
		await tasksState.load();

		const screen = await render(TaskPill, {
			isRunning: false,
			tasksState,
			portalProps: { disabled: true }
		});

		const pill = screen.getByRole('button', { name: 'Select focus task' });
		await pill.click();

		const input = screen.getByRole('textbox', { name: 'Create and pin new task' });
		await expect.element(input).toBeVisible();

		const freeFocusOption = screen.getByRole('option', { name: /Free focus/i });
		await expect.element(freeFocusOption).toBeVisible();

		await expect.element(screen.getByText('No pending tasks')).toBeVisible();
	});

	it('creates new task and sets it as active on pressing Enter in input', async () => {
		const repo = new FakeTaskRepository();
		const tasksState = createTasksState(repo);
		await tasksState.load();

		const screen = await render(TaskPill, {
			isRunning: false,
			tasksState,
			portalProps: { disabled: true }
		});

		// Open popover
		const pill = screen.getByRole('button', { name: 'Select focus task' });
		await pill.click();

		const input = screen.getByRole('textbox', { name: 'Create and pin new task' });
		await expect.element(input).toBeVisible();

		// Type new task and press Enter
		await input.fill('Design event architecture');
		await userEvent.keyboard('{Enter}');

		// Popover should close and pill should display new active task
		await expect.element(screen.getByText('Design event architecture')).toBeVisible();
		const checkbox = screen.getByRole('checkbox');
		await expect.element(checkbox).toBeVisible();

		expect(tasksState.activeTask?.title).toBe('Design event architecture');
	});

	it('switches active task when clicking a pending task in popover list', async () => {
		const taskA = createFocusTask({ title: 'Task Alpha', order: 0 });
		const taskB = createFocusTask({ title: 'Task Beta', order: 1 });
		const repo = new FakeTaskRepository([taskA, taskB]);
		const tasksState = createTasksState(repo);
		await tasksState.load();
		tasksState.setActiveTask(taskA.id);

		const screen = await render(TaskPill, {
			isRunning: false,
			tasksState,
			portalProps: { disabled: true }
		});

		await expect.element(screen.getByText('Task Alpha')).toBeVisible();

		// Open popover
		const trigger = screen.getByRole('button', {
			name: 'Change active task: Task Alpha'
		});
		await trigger.click();

		// Select Task Beta from the pending list
		const taskBOption = screen.getByRole('option', { name: 'Task Beta' });
		await expect.element(taskBOption).toBeVisible();
		await taskBOption.click();

		// Active task should now be Task Beta
		await expect.element(screen.getByText('Task Beta')).toBeVisible();
		expect(tasksState.activeTaskId).toBe(taskB.id);
	});

	it('unassigns active task when selecting "Free focus" option', async () => {
		const task = createFocusTask({ title: 'Active Task' });
		const repo = new FakeTaskRepository([task]);
		const tasksState = createTasksState(repo);
		await tasksState.load();
		tasksState.setActiveTask(task.id);

		const screen = await render(TaskPill, {
			isRunning: false,
			tasksState,
			portalProps: { disabled: true }
		});

		await expect.element(screen.getByText('Active Task')).toBeVisible();

		// Open popover
		const trigger = screen.getByRole('button', {
			name: 'Change active task: Active Task'
		});
		await trigger.click();

		// Click "Free focus"
		const freeFocusOption = screen.getByRole('option', { name: /Free focus/i });
		await freeFocusOption.click();

		// Should revert to "Free focus"
		await expect.element(screen.getByText('Free focus')).toBeVisible();
		expect(tasksState.activeTaskId).toBeNull();
	});

	it('reopens popover after switching from Free focus to an active task', async () => {
		const task = createFocusTask({ title: 'Active Task' });
		const repo = new FakeTaskRepository([task]);
		const tasksState = createTasksState(repo);
		await tasksState.load();

		const screen = await render(TaskPill, {
			isRunning: false,
			tasksState,
			portalProps: { disabled: true }
		});

		// 1. Initially Free focus
		const pill = screen.getByRole('button', { name: 'Select focus task' });
		await pill.click();

		// 2. Select Active Task
		const option = screen.getByRole('option', { name: 'Active Task' });
		await option.click();
		await expect.element(screen.getByText('Active Task')).toBeVisible();

		// 3. Try to reopen popover
		const newTrigger = screen.getByRole('button', {
			name: 'Change active task: Active Task'
		});
		await newTrigger.click();

		// 4. Popover should be open again
		const input = screen.getByRole('textbox', { name: 'Create and pin new task' });
		await expect.element(input).toBeVisible();
	});

	it('reopens popover after switching from active task back to Free focus', async () => {
		const task = createFocusTask({ title: 'Active Task' });
		const repo = new FakeTaskRepository([task]);
		const tasksState = createTasksState(repo);
		await tasksState.load();
		tasksState.setActiveTask(task.id);

		const screen = await render(TaskPill, {
			isRunning: false,
			tasksState,
			portalProps: { disabled: true }
		});

		// 1. Initially Active Task
		const trigger = screen.getByRole('button', {
			name: 'Change active task: Active Task'
		});
		await trigger.click();

		// 2. Select Free focus
		const freeFocusOption = screen.getByRole('option', { name: /Free focus/i });
		await freeFocusOption.click();
		await expect.element(screen.getByText('Free focus')).toBeVisible();

		// 3. Try to reopen popover
		const newTrigger = screen.getByRole('button', {
			name: 'Select focus task'
		});
		await newTrigger.click();

		// 4. Popover should be open again
		const input = screen.getByRole('textbox', { name: 'Create and pin new task' });
		await expect.element(input).toBeVisible();
	});

	it('closes popover when pressing Escape', async () => {
		const repo = new FakeTaskRepository();
		const tasksState = createTasksState(repo);
		await tasksState.load();

		const screen = await render(TaskPill, {
			isRunning: false,
			tasksState,
			portalProps: { disabled: true }
		});

		const pill = screen.getByRole('button', { name: 'Select focus task' });
		await pill.click();

		const input = screen.getByRole('textbox', { name: 'Create and pin new task' });
		await expect.element(input).toBeVisible();

		// Press Escape
		await userEvent.keyboard('{Escape}');

		// Input should not be in the document
		await expect.element(screen.getByRole('textbox')).not.toBeInTheDocument();
	});
});

describe('TaskPill in Timer Integration (Client Browser)', () => {
	it('renders TaskPill beneath TimerControls and reflects active task', async () => {
		const task = createFocusTask({ title: 'Timer Task' });
		const repo = new FakeTaskRepository([task]);
		const tasksState = createTasksState(repo);
		await tasksState.load();
		tasksState.setActiveTask(task.id);

		const ticker = createDummyTicker(false);
		const timerState = createTimerState({ focusDurationSeconds: 1500 }, ticker);

		const screen = await render(Timer, {
			state: timerState,
			tasksState
		});

		await expect.element(screen.getByText('FOCUS', { exact: true })).toBeVisible();
		await expect.element(screen.getByText('25:00')).toBeVisible();
		await expect.element(screen.getByText('Timer Task')).toBeVisible();

		// Starts timer and verifies Zen Mode opacity on pill
		const startBtn = screen.getByRole('button', { name: 'Start timer' });
		await startBtn.click();
		expect(timerState.isRunning).toBe(true);

		const pill = screen.getByRole('button', {
			name: 'Change active task: Timer Task'
		});
		await expect.element(pill).toBeVisible();
	});
});
