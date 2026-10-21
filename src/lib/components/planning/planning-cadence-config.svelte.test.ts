import { describe, it, expect } from 'vitest';
import { render } from 'vitest-browser-svelte';
import PlanningCadenceConfig from './planning-cadence-config.svelte';
import { createPlanningState } from '$lib/state/planning.svelte';
import { createCadencePresetsState } from '$lib/state/cadence-presets.svelte';
import { createTimerState } from '$lib/state/timer.svelte';
import { createTasksState } from '$lib/state/tasks.svelte';
import { localeState } from '$lib/state/locale.svelte';
import { FakeCadencePresetRepository } from '$tests/fakes/repositories/fake-cadence-preset-repository';
import {
	MAX_CUSTOM_CADENCE_PRESETS,
	cadencePresetId,
	type CadencePreset,
	type CadenceValues
} from '$lib/domain/planning/cadence-preset.entity';
import type { ISessionPlanRepository } from '$lib/domain/ports/session-plan-repository.port';
import type { ITaskRepository } from '$lib/domain/ports/task-repository.port';
import type { SessionPlan } from '$lib/domain/planning/session-plan.entity';
import type { FocusTask } from '$lib/domain/tasks/task.entity';

const DEEP_WORK: CadenceValues = {
	focusMinutes: 45,
	shortBreakMinutes: 15,
	longBreakMinutes: 30,
	longBreakInterval: 3
};

function createPreset(name: string, values: CadenceValues = DEEP_WORK): CadencePreset {
	return { id: cadencePresetId(values), name, ...values };
}

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
	async getAll(): Promise<readonly FocusTask[]> {
		return [];
	}
	async getPending(): Promise<readonly FocusTask[]> {
		return [];
	}
	async save(): Promise<void> {}
	async saveBatch(): Promise<void> {}
	async delete(): Promise<void> {}
	async clearCompleted(): Promise<void> {}
	async clearAll(): Promise<void> {}
}

function setupPlanningState() {
	const taskRepo = new MockTaskRepository();
	const tasksState = createTasksState(taskRepo);
	const planRepo = new MockSessionPlanRepository();
	const timerState = createTimerState();
	return createPlanningState(planRepo, timerState, tasksState);
}

describe('PlanningCadenceConfig (Client Browser)', () => {
	async function setupScreen(presets: readonly CadencePreset[] = []) {
		const planningState = setupPlanningState();
		const presetsState = createCadencePresetsState(new FakeCadencePresetRepository(presets));
		await presetsState.load();
		return { planningState, presetsState };
	}

	it('renders preset chips and highlights active 25/5 preset by default', async () => {
		const planningState = setupPlanningState();
		const screen = await render(PlanningCadenceConfig, { planningState });

		const classicBtn = screen.getByRole('button', { name: /25\/5 Classic/i });
		const deepFocusBtn = screen.getByRole('button', { name: /50\/10 Deep Focus/i });
		const ultradianBtn = screen.getByRole('button', { name: /90\/20 Ultradian Rhythm/i });

		await expect.element(classicBtn).toBeVisible();
		await expect.element(deepFocusBtn).toBeVisible();
		await expect.element(ultradianBtn).toBeVisible();

		// Classic should be active (aria-pressed=true)
		await expect.element(classicBtn).toHaveAttribute('aria-pressed', 'true');
		await expect.element(deepFocusBtn).toHaveAttribute('aria-pressed', 'false');
	});

	it('switches cadence when clicking a preset chip', async () => {
		const planningState = setupPlanningState();
		const screen = await render(PlanningCadenceConfig, { planningState });

		const deepFocusBtn = screen.getByRole('button', { name: /50\/10 Deep Focus/i });
		await deepFocusBtn.click();

		expect(planningState.focusMinutes).toBe(50);
		expect(planningState.shortBreakMinutes).toBe(10);
		expect(planningState.longBreakMinutes).toBe(20);
		expect(planningState.longBreakInterval).toBe(4);

		await expect.element(deepFocusBtn).toHaveAttribute('aria-pressed', 'true');

		// Click ultradian preset
		const ultradianBtn = screen.getByRole('button', { name: /90\/20 Ultradian Rhythm/i });
		await ultradianBtn.click();

		expect(planningState.focusMinutes).toBe(90);
		expect(planningState.shortBreakMinutes).toBe(20);
		expect(planningState.longBreakMinutes).toBe(30);
		expect(planningState.longBreakInterval).toBe(3);
		await expect.element(ultradianBtn).toHaveAttribute('aria-pressed', 'true');
	});

	it('adjusts block count in blocks mode', async () => {
		const planningState = setupPlanningState();
		const screen = await render(PlanningCadenceConfig, { planningState });

		expect(planningState.blockCount).toBe(4);

		const incBtn = screen.getByRole('button', { name: 'Increase block count' });
		await incBtn.click();
		expect(planningState.blockCount).toBe(5);

		const decBtn = screen.getByRole('button', { name: 'Decrease block count' });
		await decBtn.click();
		expect(planningState.blockCount).toBe(4);
	});

	it('renders target end time and scheduled start in end_time mode', async () => {
		const planningState = setupPlanningState();
		planningState.setTargetMode('end_time');

		const screen = await render(PlanningCadenceConfig, { planningState });

		await expect.element(screen.getByLabelText('Target finish time')).toBeVisible();
		await expect.element(screen.getByLabelText('Scheduled start time')).toBeVisible();
		await expect.element(screen.getByRole('button', { name: 'Now' })).toBeVisible();
	});

	it('toggles progressive disclosure panel and reveals fine-tuning steppers', async () => {
		const planningState = setupPlanningState();
		const screen = await render(PlanningCadenceConfig, { planningState });

		const toggleBtn = screen.getByRole('button', { name: 'Customize cadence' });
		await expect.element(toggleBtn).toBeVisible();
		await expect.element(toggleBtn).toHaveAttribute('aria-expanded', 'false');

		// Steppers should not be in document initially
		await expect
			.element(screen.getByRole('button', { name: 'Increase focus duration' }))
			.not.toBeInTheDocument();

		// Expand
		await toggleBtn.click();
		await expect.element(toggleBtn).toHaveAttribute('aria-expanded', 'true');

		const incFocusBtn = screen.getByRole('button', { name: 'Increase focus duration' });
		await expect.element(incFocusBtn).toBeVisible();

		// Tweak focus to custom 30m
		await incFocusBtn.click();
		expect(planningState.focusMinutes).toBe(30);

		// "Custom" badge should now be visible
		await expect.element(screen.getByText('Custom', { exact: true })).toBeVisible();

		// Collapse
		await toggleBtn.click();
		await expect.element(toggleBtn).toHaveAttribute('aria-expanded', 'false');
		await expect
			.element(screen.getByRole('button', { name: 'Increase focus duration' }))
			.not.toBeInTheDocument();
	});

	it('renders localized labels and steppers when switching to Spanish', async () => {
		localeState.setLocale('es');

		const planningState = setupPlanningState();
		const screen = await render(PlanningCadenceConfig, { planningState });

		// Verify preset heading
		await expect.element(screen.getByText('Ritmo predefinido')).toBeVisible();

		// Verify localized preset chips
		const classicBtn = screen.getByRole('button', { name: /25\/5 Clásico/i });
		const deepFocusBtn = screen.getByRole('button', { name: /50\/10 Foco profundo/i });
		const ultradianBtn = screen.getByRole('button', { name: /90\/20 Ritmo ultradiano/i });
		await expect.element(classicBtn).toBeVisible();
		await expect.element(deepFocusBtn).toBeVisible();
		await expect.element(ultradianBtn).toBeVisible();

		// Verify Blocks heading and button
		await expect.element(screen.getByText('Bloques')).toBeVisible();
		const incBlocksBtn = screen.getByRole('button', { name: 'Aumentar cantidad de bloques' });
		await expect.element(incBlocksBtn).toBeVisible();

		// Verify customize cadence
		const toggleBtn = screen.getByRole('button', { name: 'Personalizar ritmo' });
		await expect.element(toggleBtn).toBeVisible();

		// Expand custom cadence, verify stepper labels
		await toggleBtn.click();
		await expect.element(screen.getByText('Foco', { exact: true })).toBeVisible();
		await expect.element(screen.getByText('Descanso corto')).toBeVisible();
		await expect.element(screen.getByText('Descanso largo')).toBeVisible();
		await expect.element(screen.getByText('Intervalo')).toBeVisible();

		// Tweak focus and verify custom badge
		const incFocusBtn = screen.getByRole('button', { name: 'Aumentar duración de foco' });
		await incFocusBtn.click();
		await expect.element(screen.getByText('Personalizado', { exact: true })).toBeVisible();

		// Switch target mode to 'end_time' and verify
		planningState.setTargetMode('end_time');
		await expect.element(screen.getByLabelText('Hora de finalización objetivo')).toBeVisible();
		await expect.element(screen.getByLabelText('Hora de inicio programada')).toBeVisible();
		await expect.element(screen.getByRole('button', { name: 'Ahora' })).toBeVisible();
	});

	describe('custom presets', () => {
		it('applies a saved custom preset restoring all four values', async () => {
			const { planningState, presetsState } = await setupScreen([createPreset('Deep work')]);
			const screen = await render(PlanningCadenceConfig, { planningState, presetsState });

			const chip = screen.getByRole('button', {
				name: 'Select Deep work 45/15/30/3 cadence preset'
			});
			await expect.element(chip).toBeVisible();
			await chip.click();

			expect(planningState.focusMinutes).toBe(45);
			expect(planningState.shortBreakMinutes).toBe(15);
			expect(planningState.longBreakMinutes).toBe(30);
			expect(planningState.longBreakInterval).toBe(3);

			await expect.element(chip).toHaveAttribute('aria-pressed', 'true');
		});

		it('does not highlight a built-in cadence when only focus and short break match', async () => {
			const { planningState, presetsState } = await setupScreen();
			const screen = await render(PlanningCadenceConfig, { planningState, presetsState });

			const classicBtn = screen.getByRole('button', { name: /25\/5 Classic/i });
			await expect.element(classicBtn).toHaveAttribute('aria-pressed', 'true');

			planningState.setLongBreakMinutes(30);

			await expect.element(classicBtn).toHaveAttribute('aria-pressed', 'false');
			await expect.element(screen.getByText('Custom', { exact: true })).toBeVisible();
		});

		it('saves the current cadence as a named preset from the row', async () => {
			const { planningState, presetsState } = await setupScreen();
			planningState.applyCadence(DEEP_WORK);
			const screen = await render(PlanningCadenceConfig, { planningState, presetsState });

			await screen.getByRole('button', { name: 'Save current cadence as preset' }).click();
			await expect.element(screen.getByText('Save preset')).toBeVisible();
			await expect.element(screen.getByText('45/15/30/3')).toBeVisible();

			await screen.getByLabelText('Name').fill('Deep work');
			await screen.getByRole('button', { name: 'Save', exact: true }).click();

			const chip = screen.getByRole('button', {
				name: 'Select Deep work 45/15/30/3 cadence preset'
			});
			await expect.element(chip).toBeVisible();
			await expect.element(chip).toHaveAttribute('aria-pressed', 'true');
			expect(presetsState.presets).toEqual([createPreset('Deep work')]);
		});

		it('rejects a cadence that is already saved and keeps the row unchanged', async () => {
			const { planningState, presetsState } = await setupScreen([createPreset('Deep work')]);
			planningState.applyCadence(DEEP_WORK);
			const screen = await render(PlanningCadenceConfig, { planningState, presetsState });

			await screen.getByRole('button', { name: 'Save current cadence as preset' }).click();
			await screen.getByLabelText('Name').fill('Other name');
			await screen.getByRole('button', { name: 'Save', exact: true }).click();

			await expect
				.element(screen.getByText('You already have a preset with that cadence.'))
				.toBeVisible();
			expect(presetsState.presets).toEqual([createPreset('Deep work')]);
		});

		it('rejects an empty name', async () => {
			const { planningState, presetsState } = await setupScreen();
			const screen = await render(PlanningCadenceConfig, { planningState, presetsState });

			await screen.getByRole('button', { name: 'Save current cadence as preset' }).click();
			await screen.getByLabelText('Name').fill('   ');
			await screen.getByRole('button', { name: 'Save', exact: true }).click();

			await expect.element(screen.getByText('Enter a name.')).toBeVisible();
			expect(presetsState.presets).toEqual([]);
		});

		it('renames a saved preset keeping its values', async () => {
			const { planningState, presetsState } = await setupScreen([createPreset('Deep work')]);
			const screen = await render(PlanningCadenceConfig, { planningState, presetsState });

			await screen.getByRole('button', { name: 'Preset actions: Deep work' }).click();
			await screen.getByRole('button', { name: 'Rename', exact: true }).click();
			await screen.getByLabelText('Name').fill('Focus 45');
			await screen.getByRole('button', { name: 'Rename', exact: true }).click();

			const renamed = screen.getByRole('button', {
				name: 'Select Focus 45 45/15/30/3 cadence preset'
			});
			await expect.element(renamed).toBeVisible();
			expect(presetsState.presets).toEqual([createPreset('Focus 45')]);
		});

		it('deletes a saved preset without changing the current cadence', async () => {
			const { planningState, presetsState } = await setupScreen([createPreset('Deep work')]);
			const screen = await render(PlanningCadenceConfig, { planningState, presetsState });

			await screen
				.getByRole('button', { name: 'Select Deep work 45/15/30/3 cadence preset' })
				.click();
			await screen.getByRole('button', { name: 'Preset actions: Deep work' }).click();
			await screen.getByRole('button', { name: 'Delete', exact: true }).click();

			await expect
				.element(screen.getByRole('button', { name: 'Preset actions: Deep work' }))
				.not.toBeInTheDocument();
			expect(presetsState.presets).toEqual([]);
			expect(planningState.focusMinutes).toBe(45);
			expect(planningState.shortBreakMinutes).toBe(15);
			expect(planningState.longBreakMinutes).toBe(30);
			expect(planningState.longBreakInterval).toBe(3);
		});

		it('disables the save chip once the custom limit is reached', async () => {
			const presets = Array.from({ length: MAX_CUSTOM_CADENCE_PRESETS }, (_, index) =>
				createPreset(`Preset ${index}`, { ...DEEP_WORK, focusMinutes: 10 + index })
			);
			const { planningState, presetsState } = await setupScreen(presets);
			const screen = await render(PlanningCadenceConfig, { planningState, presetsState });

			await expect
				.element(screen.getByRole('button', { name: 'Save current cadence as preset' }))
				.toBeDisabled();
		});

		it('renders the custom preset copy in Spanish', async () => {
			localeState.setLocale('es');

			const { planningState, presetsState } = await setupScreen([createPreset('Foco 45')]);
			const screen = await render(PlanningCadenceConfig, { planningState, presetsState });

			await screen.getByRole('button', { name: 'Guardar la cadencia actual como preset' }).click();
			await expect.element(screen.getByText('Guardar preset')).toBeVisible();

			await screen.getByLabelText('Nombre').fill('Foco 45');
			await screen.getByRole('button', { name: 'Guardar', exact: true }).click();

			await expect.element(screen.getByText('Ya tenés un preset con ese nombre.')).toBeVisible();
		});
	});
});
