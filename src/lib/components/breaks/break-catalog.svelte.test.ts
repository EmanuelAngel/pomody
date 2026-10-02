import { describe, it, expect, vi } from 'vitest';
import { render } from 'vitest-browser-svelte';
import BreakCatalog from './break-catalog.svelte';
import { createBreaksState } from '$lib/state/breaks.svelte';
import type { IBreakActivityRepository } from '$lib/domain/ports/break-activity-repository.port';
import { sortBreakActivities } from '$lib/domain/ports/break-activity-repository.port';
import {
	createBreakActivity,
	type BreakActivity,
	type BreakCategory
} from '$lib/domain/breaks/break-activity.entity';

class MockBreakActivityRepository implements IBreakActivityRepository {
	private activities = new Map<string, BreakActivity>();

	constructor(initialActivities: readonly BreakActivity[] = []) {
		for (const act of initialActivities) {
			this.activities.set(act.id, act);
		}
	}

	async getAll(): Promise<readonly BreakActivity[]> {
		return sortBreakActivities(Array.from(this.activities.values()));
	}

	async getByCategory(category: BreakCategory): Promise<readonly BreakActivity[]> {
		return sortBreakActivities(
			Array.from(this.activities.values()).filter((a) => a.category === category)
		);
	}

	async save(activity: BreakActivity): Promise<void> {
		this.activities.set(activity.id, activity);
	}

	async delete(activityId: string): Promise<void> {
		this.activities.delete(activityId);
	}

	async resetToDefaults(): Promise<void> {
		this.activities.clear();
	}

	async clearAll(): Promise<void> {
		this.activities.clear();
	}
}

const phys1 = createBreakActivity({
	id: 'phys-1',
	title: 'Neck & Shoulder Release',
	category: 'physical',
	durationMinutes: 2,
	isPreset: true,
	guide: '1. Tilt ear to shoulder.'
});

const phys2 = createBreakActivity({
	id: 'phys-2',
	title: 'Quick Room Stroll',
	category: 'physical',
	durationMinutes: 5,
	isPreset: false
});

const mind1 = createBreakActivity({
	id: 'mind-1',
	title: 'Box Breathing Focus',
	category: 'mindful',
	durationMinutes: 3,
	isPreset: true,
	guide: '1. Inhale 4s.'
});

const hydr1 = createBreakActivity({
	id: 'hydr-1',
	title: 'Hydrate with Fresh Water',
	category: 'hydration',
	durationMinutes: 1,
	isPreset: true
});

const sampleActivities = [phys1, phys2, mind1, hydr1];

describe('BreakCatalog (Client Browser)', () => {
	it('calls breaksState.load() on mount and renders all activities', async () => {
		const repo = new MockBreakActivityRepository(sampleActivities);
		const breaksState = createBreaksState(repo);
		const loadSpy = vi.spyOn(breaksState, 'load');

		const screen = await render(BreakCatalog, { breaksState });

		expect(loadSpy).toHaveBeenCalled();
		await expect.element(screen.getByText('Neck & Shoulder Release')).toBeVisible();
		await expect.element(screen.getByText('Quick Room Stroll')).toBeVisible();
		await expect.element(screen.getByText('Box Breathing Focus')).toBeVisible();
		await expect.element(screen.getByText('Hydrate with Fresh Water')).toBeVisible();
	});

	it('renders filter chips with dynamic count badges and initial "All" selection', async () => {
		const repo = new MockBreakActivityRepository(sampleActivities);
		const breaksState = createBreaksState(repo);
		await breaksState.load();

		const screen = await render(BreakCatalog, { breaksState });

		const allChip = screen.getByRole('button', { name: 'All (4)' });
		const physChip = screen.getByRole('button', { name: 'Physical (2)' });
		const mindChip = screen.getByRole('button', { name: 'Mindful (1)' });
		const hydrChip = screen.getByRole('button', { name: 'Hydration (1)' });

		await expect.element(allChip).toBeVisible();
		await expect.element(physChip).toBeVisible();
		await expect.element(mindChip).toBeVisible();
		await expect.element(hydrChip).toBeVisible();

		expect(allChip.element().getAttribute('aria-pressed')).toBe('true');
		expect(physChip.element().getAttribute('aria-pressed')).toBe('false');
	});

	it('filters activities reactively when category chips are clicked', async () => {
		const repo = new MockBreakActivityRepository(sampleActivities);
		const breaksState = createBreaksState(repo);
		await breaksState.load();

		const screen = await render(BreakCatalog, { breaksState });

		const physChip = screen.getByRole('button', { name: 'Physical (2)' });
		await physChip.click();

		expect(physChip.element().getAttribute('aria-pressed')).toBe('true');
		await expect.element(screen.getByText('Neck & Shoulder Release')).toBeVisible();
		await expect.element(screen.getByText('Quick Room Stroll')).toBeVisible();
		await expect.element(screen.getByText('Box Breathing Focus')).not.toBeInTheDocument();
		await expect.element(screen.getByText('Hydrate with Fresh Water')).not.toBeInTheDocument();

		const mindChip = screen.getByRole('button', { name: 'Mindful (1)' });
		await mindChip.click();

		expect(mindChip.element().getAttribute('aria-pressed')).toBe('true');
		await expect.element(screen.getByText('Box Breathing Focus')).toBeVisible();
		await expect.element(screen.getByText('Neck & Shoulder Release')).not.toBeInTheDocument();

		const allChip = screen.getByRole('button', { name: 'All (4)' });
		await allChip.click();

		expect(allChip.element().getAttribute('aria-pressed')).toBe('true');
		await expect.element(screen.getByText('Neck & Shoulder Release')).toBeVisible();
		await expect.element(screen.getByText('Hydrate with Fresh Water')).toBeVisible();
	});

	it('displays clean, accessible empty state when a filtered category has 0 activities', async () => {
		const repo = new MockBreakActivityRepository([phys1, phys2]);
		const breaksState = createBreaksState(repo);
		await breaksState.load();

		const screen = await render(BreakCatalog, { breaksState });

		const hydrChip = screen.getByRole('button', { name: 'Hydration (0)' });
		await hydrChip.click();

		await expect.element(screen.getByText('No hydration activities found')).toBeVisible();
		await expect
			.element(screen.getByText(/Try selecting another category or add a new hydration habit/))
			.toBeVisible();
	});

	it('displays empty state when catalog contains no activities', async () => {
		const repo = new MockBreakActivityRepository([]);
		const breaksState = createBreaksState(repo);
		await breaksState.load();

		const screen = await render(BreakCatalog, { breaksState });

		await expect.element(screen.getByText('No break activities available')).toBeVisible();
		await expect
			.element(screen.getByText(/Reset catalog to default presets or create a custom habit/))
			.toBeVisible();
	});

	it('renders action triggers and invokes callbacks when provided', async () => {
		const repo = new MockBreakActivityRepository(sampleActivities);
		const breaksState = createBreaksState(repo);
		await breaksState.load();

		const onNewHabit = vi.fn();
		const onResetDefaults = vi.fn();

		const screen = await render(BreakCatalog, {
			breaksState,
			onNewHabit,
			onResetDefaults
		});

		const newHabitBtn = screen.getByRole('button', { name: 'New Habit' });
		const resetBtn = screen.getByRole('button', { name: 'Reset defaults' });

		await expect.element(newHabitBtn).toBeVisible();
		await expect.element(resetBtn).toBeVisible();

		await newHabitBtn.click();
		expect(onNewHabit).toHaveBeenCalledTimes(1);

		await resetBtn.click();
		expect(onResetDefaults).toHaveBeenCalledTimes(1);
	});

	it('does not render action buttons when action callbacks are omitted', async () => {
		const repo = new MockBreakActivityRepository(sampleActivities);
		const breaksState = createBreaksState(repo);
		await breaksState.load();

		const screen = await render(BreakCatalog, { breaksState });

		await expect.element(screen.getByRole('button', { name: 'New Habit' })).not.toBeInTheDocument();
		await expect
			.element(screen.getByRole('button', { name: 'Reset defaults' }))
			.not.toBeInTheDocument();
	});

	it('reactively updates counts and list when new activity is saved in breaksState', async () => {
		const repo = new MockBreakActivityRepository([phys1]);
		const breaksState = createBreaksState(repo);
		await breaksState.load();

		const screen = await render(BreakCatalog, { breaksState });

		await expect.element(screen.getByRole('button', { name: 'All (1)' })).toBeVisible();
		await expect.element(screen.getByRole('button', { name: 'Mindful (0)' })).toBeVisible();

		// Add mindful activity dynamically
		await breaksState.saveActivity(mind1);

		await expect.element(screen.getByRole('button', { name: 'All (2)' })).toBeVisible();
		await expect.element(screen.getByRole('button', { name: 'Mindful (1)' })).toBeVisible();
		await expect.element(screen.getByText('Box Breathing Focus')).toBeVisible();
	});
});
