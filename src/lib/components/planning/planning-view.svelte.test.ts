import { describe, it, expect } from 'vitest';
import { render } from 'vitest-browser-svelte';
import { userEvent } from 'vitest/browser';
import PlanningView from './planning-view.svelte';
import { createTasksState } from '$lib/state/tasks.svelte';
import { createNavigationState } from '$lib/state/navigation.svelte';
import type { ITaskRepository } from '$lib/domain/ports/task-repository.port';
import { sortFocusTasks } from '$lib/domain/ports/task-repository.port';
import { createFocusTask, toggleFocusTask, type FocusTask } from '$lib/domain/tasks/task.entity';

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
});
