import { describe, it, expect } from 'vitest';
import { render } from 'vitest-browser-svelte';
import { userEvent } from 'vitest/browser';
import TaskBacklog from './task-backlog.svelte';
import { createTasksState } from '$lib/state/tasks.svelte';
import { createPlanningState } from '$lib/state/planning.svelte';
import { createFocusTask, toggleFocusTask } from '$lib/domain/tasks/task.entity';
import { FakeTaskRepository } from '$tests/fakes/repositories/fake-task-repository';
import { FakeSessionPlanRepository } from '$tests/fakes/repositories/fake-session-plan-repository';
import { localeState } from '$lib/state/locale.svelte';

describe('TaskBacklog (Client Browser)', () => {
	it('renders header, remaining counter, and empty pending message when empty', async () => {
		const taskRepo = new FakeTaskRepository();
		const planRepo = new FakeSessionPlanRepository();
		const tasksState = createTasksState(taskRepo);
		const planningState = createPlanningState(planRepo);
		await tasksState.load();
		await planningState.load();

		const screen = await render(TaskBacklog, { tasksState, planningState });

		// Region aria-label and heading
		await expect.element(screen.getByRole('region', { name: 'Task Backlog' })).toBeVisible();
		await expect.element(screen.getByRole('heading', { name: 'Tasks Backlog' })).toBeVisible();
		await expect.element(screen.getByText('0 remaining')).toBeVisible();

		// Quick capture input
		const input = screen.getByRole('textbox', {
			name: 'Add a new focus task... (Enter to add)'
		});
		await expect.element(input).toBeVisible();

		// Empty pending tasks
		await expect
			.element(screen.getByText('No pending tasks. Add one to plan your session.'))
			.toBeVisible();
		await expect.element(screen.getByText('Pending (0)')).toBeVisible();
	});

	it('renders pending and completed tasks correctly', async () => {
		const pendingTask = createFocusTask({ title: 'Pending Work' });
		const completedTask = toggleFocusTask(createFocusTask({ title: 'Completed Work' }));
		const taskRepo = new FakeTaskRepository([pendingTask, completedTask]);
		const planRepo = new FakeSessionPlanRepository();
		const tasksState = createTasksState(taskRepo);
		const planningState = createPlanningState(planRepo);
		await tasksState.load();
		await planningState.load();

		const screen = await render(TaskBacklog, { tasksState, planningState });

		await expect.element(screen.getByText('1 remaining')).toBeVisible();
		await expect.element(screen.getByText('Pending (1)')).toBeVisible();
		await expect.element(screen.getByText('Pending Work')).toBeVisible();

		await expect.element(screen.getByText('Completed (1)')).toBeVisible();
		await expect.element(screen.getByText('Completed Work')).toBeVisible();
		await expect.element(screen.getByRole('button', { name: 'Clear completed' })).toBeVisible();
	});

	it('adds a new task via input keydown Enter', async () => {
		const taskRepo = new FakeTaskRepository();
		const planRepo = new FakeSessionPlanRepository();
		const tasksState = createTasksState(taskRepo);
		const planningState = createPlanningState(planRepo);
		await tasksState.load();
		await planningState.load();

		const screen = await render(TaskBacklog, { tasksState, planningState });
		const input = screen.getByRole('textbox', {
			name: 'Add a new focus task... (Enter to add)'
		});

		await input.fill('New task from Enter');
		await userEvent.keyboard('{Enter}');

		await expect.element(screen.getByText('New task from Enter')).toBeVisible();
		await expect.element(screen.getByText('1 remaining')).toBeVisible();
		await expect.element(screen.getByText('Pending (1)')).toBeVisible();
		expect(tasksState.pendingTasks.length).toBe(1);
	});

	it('adds a new task by clicking the plus button', async () => {
		const taskRepo = new FakeTaskRepository();
		const planRepo = new FakeSessionPlanRepository();
		const tasksState = createTasksState(taskRepo);
		const planningState = createPlanningState(planRepo);
		await tasksState.load();
		await planningState.load();

		const screen = await render(TaskBacklog, { tasksState, planningState });
		const input = screen.getByRole('textbox', {
			name: 'Add a new focus task... (Enter to add)'
		});

		await input.fill('New task from button');
		const plusBtn = screen.getByRole('button', { name: 'Add task' });
		await expect.element(plusBtn).toBeVisible();
		await plusBtn.click();

		await expect.element(screen.getByText('New task from button')).toBeVisible();
		await expect.element(screen.getByText('1 remaining')).toBeVisible();
		expect(tasksState.pendingTasks.length).toBe(1);
	});

	it('clears completed tasks when clicking clear completed button', async () => {
		const completed1 = toggleFocusTask(createFocusTask({ title: 'Done 1' }));
		const completed2 = toggleFocusTask(createFocusTask({ title: 'Done 2' }));
		const taskRepo = new FakeTaskRepository([completed1, completed2]);
		const planRepo = new FakeSessionPlanRepository();
		const tasksState = createTasksState(taskRepo);
		const planningState = createPlanningState(planRepo);
		await tasksState.load();
		await planningState.load();

		const screen = await render(TaskBacklog, { tasksState, planningState });

		await expect.element(screen.getByText('Completed (2)')).toBeVisible();
		const clearBtn = screen.getByRole('button', { name: 'Clear completed' });
		await expect.element(clearBtn).toBeVisible();
		await clearBtn.click();

		await expect.element(screen.getByText('Completed (2)')).not.toBeInTheDocument();
		expect(tasksState.completedTasks.length).toBe(0);
	});

	it('reactively updates all text and aria-labels when switching between en and es', async () => {
		const pendingTask = createFocusTask({ title: 'Backlog Item' });
		const completedTask = toggleFocusTask(createFocusTask({ title: 'Finished Item' }));
		const taskRepo = new FakeTaskRepository([pendingTask, completedTask]);
		const planRepo = new FakeSessionPlanRepository();
		const tasksState = createTasksState(taskRepo);
		const planningState = createPlanningState(planRepo);
		await tasksState.load();
		await planningState.load();

		const screen = await render(TaskBacklog, { tasksState, planningState });

		// 1. Verify English strings
		await expect.element(screen.getByRole('region', { name: 'Task Backlog' })).toBeVisible();
		await expect.element(screen.getByRole('heading', { name: 'Tasks Backlog' })).toBeVisible();
		await expect.element(screen.getByText('1 remaining')).toBeVisible();
		await expect
			.element(
				screen.getByRole('textbox', {
					name: 'Add a new focus task... (Enter to add)'
				})
			)
			.toBeVisible();
		await expect.element(screen.getByText('Pending (1)')).toBeVisible();
		await expect.element(screen.getByText('Completed (1)')).toBeVisible();
		await expect.element(screen.getByRole('button', { name: 'Clear completed' })).toBeVisible();

		// 2. Switch to Spanish
		localeState.setLocale('es');

		await expect.element(screen.getByRole('region', { name: 'Tareas pendientes' })).toBeVisible();
		await expect.element(screen.getByRole('heading', { name: 'Tareas pendientes' })).toBeVisible();
		await expect.element(screen.getByText('1 restantes')).toBeVisible();
		const inputEs = screen.getByRole('textbox', {
			name: 'Agregá una nueva tarea de foco... (Enter para agregar)'
		});
		await expect.element(inputEs).toBeVisible();
		await expect.element(screen.getByText('Pendientes (1)')).toBeVisible();
		await expect.element(screen.getByText('Completadas (1)')).toBeVisible();
		await expect.element(screen.getByRole('button', { name: 'Borrar completadas' })).toBeVisible();

		// Plus button aria-label in Spanish
		await inputEs.fill('Nueva tarea');
		await expect.element(screen.getByRole('button', { name: 'Agregar tarea' })).toBeVisible();

		// 3. Switch back to English
		localeState.setLocale('en');

		await expect.element(screen.getByRole('region', { name: 'Task Backlog' })).toBeVisible();
		await expect.element(screen.getByRole('heading', { name: 'Tasks Backlog' })).toBeVisible();
		await expect.element(screen.getByText('1 remaining')).toBeVisible();
		await expect.element(screen.getByRole('button', { name: 'Add task' })).toBeVisible();
	});

	it('reactively updates empty pending state message when switching to Spanish', async () => {
		const taskRepo = new FakeTaskRepository();
		const planRepo = new FakeSessionPlanRepository();
		const tasksState = createTasksState(taskRepo);
		const planningState = createPlanningState(planRepo);
		await tasksState.load();
		await planningState.load();

		const screen = await render(TaskBacklog, { tasksState, planningState });

		await expect
			.element(screen.getByText('No pending tasks. Add one to plan your session.'))
			.toBeVisible();

		localeState.setLocale('es');

		await expect
			.element(screen.getByText('No hay tareas pendientes. Agregá una para planificar tu sesión.'))
			.toBeVisible();

		localeState.setLocale('en');
		await expect
			.element(screen.getByText('No pending tasks. Add one to plan your session.'))
			.toBeVisible();
	});
});
