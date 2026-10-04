import { describe, it, expect, vi } from 'vitest';
import { render } from 'vitest-browser-svelte';
import BreakRevitalization from './break-revitalization.svelte';
import { createBreaksState } from '$lib/state/breaks.svelte';
import { createBreakActivity } from '$lib/domain/breaks/break-activity.entity';
import { FakeBreakActivityRepository } from '$tests/fakes/repositories/fake-break-activity-repository';

const physicalActivity = createBreakActivity({
	id: 'act-phys',
	title: 'Neck & Shoulder Release',
	category: 'physical',
	durationMinutes: 2,
	guide: '1. Tilt ear to shoulder.\n2. Repeat other side.\n3. Roll shoulders.'
});

const mindfulActivity = createBreakActivity({
	id: 'act-mind',
	title: 'Box Breathing Focus',
	category: 'mindful',
	durationMinutes: 3,
	guide: '1. Inhale 4s.\n2. Hold 4s.\n3. Exhale 4s.'
});

const hydrationActivity = createBreakActivity({
	id: 'act-hydr',
	title: 'Hydrate with Fresh Water',
	category: 'hydration',
	durationMinutes: 1,
	guide: '1. Pour fresh water.\n2. Drink mindfully.'
});

describe('BreakRevitalization (Client Browser)', () => {
	it('renders fallback text when no active activity exists', async () => {
		const repo = new FakeBreakActivityRepository([]);
		const breaksState = createBreaksState(repo);
		await breaksState.load();

		const screen = await render(BreakRevitalization, {
			breaksState,
			mode: 'shortBreak',
			currentRound: 1,
			portalProps: { disabled: true }
		});

		await expect.element(screen.getByText('Rest and revitalize')).toBeVisible();
		await expect
			.element(screen.getByRole('button', { name: 'Shuffle break activity' }))
			.not.toBeInTheDocument();
	});

	it('renders physical activity with gold accent badge, icon and title', async () => {
		const repo = new FakeBreakActivityRepository([physicalActivity]);
		const breaksState = createBreaksState(repo);
		await breaksState.load();
		breaksState.suggestForBreak('shortBreak-1');

		const screen = await render(BreakRevitalization, {
			breaksState,
			mode: 'shortBreak',
			currentRound: 1,
			portalProps: { disabled: true }
		});

		await expect.element(screen.getByText('Neck & Shoulder Release')).toBeVisible();
		await expect.element(screen.getByText('Physical')).toBeVisible();

		const badge = screen.getByText('Physical').element().parentElement;
		expect(badge?.className).toContain('text-accent-gold');
		expect(badge?.className).toContain('bg-accent-gold/15');
	});

	it('renders mindful activity with iris accent badge', async () => {
		const repo = new FakeBreakActivityRepository([mindfulActivity]);
		const breaksState = createBreaksState(repo);
		await breaksState.load();
		breaksState.suggestForBreak('shortBreak-1');

		const screen = await render(BreakRevitalization, {
			breaksState,
			mode: 'shortBreak',
			currentRound: 1,
			portalProps: { disabled: true }
		});

		await expect.element(screen.getByText('Box Breathing Focus')).toBeVisible();
		await expect.element(screen.getByText('Mindful')).toBeVisible();

		const badge = screen.getByText('Mindful').element().parentElement;
		expect(badge?.className).toContain('text-accent-iris');
		expect(badge?.className).toContain('bg-accent-iris/15');
	});

	it('renders hydration activity with foam accent badge', async () => {
		const repo = new FakeBreakActivityRepository([hydrationActivity]);
		const breaksState = createBreaksState(repo);
		await breaksState.load();
		breaksState.suggestForBreak('shortBreak-1');

		const screen = await render(BreakRevitalization, {
			breaksState,
			mode: 'shortBreak',
			currentRound: 1,
			portalProps: { disabled: true }
		});

		await expect.element(screen.getByText('Hydrate with Fresh Water')).toBeVisible();
		await expect.element(screen.getByText('Hydration')).toBeVisible();

		const badge = screen.getByText('Hydration').element().parentElement;
		expect(badge?.className).toContain('text-accent-foam');
		expect(badge?.className).toContain('bg-accent-foam/15');
	});

	it('opens guide popover on trigger click and shows step-by-step instructions', async () => {
		const repo = new FakeBreakActivityRepository([physicalActivity]);
		const breaksState = createBreaksState(repo);
		await breaksState.load();
		breaksState.suggestForBreak('shortBreak-1');

		const screen = await render(BreakRevitalization, {
			breaksState,
			mode: 'shortBreak',
			currentRound: 1,
			portalProps: { disabled: true }
		});

		const guideButton = screen.getByRole('button', {
			name: `View instructions for ${physicalActivity.title}`
		});
		await expect.element(guideButton).toBeVisible();

		await guideButton.click();

		await expect.element(screen.getByText(/1\. Tilt ear to shoulder/)).toBeVisible();
		await expect.element(screen.getByText(/2\. Repeat other side/)).toBeVisible();
		await expect.element(screen.getByText(/3\. Roll shoulders/)).toBeVisible();
	});

	it('calls shuffle and updates active activity when shuffle button is clicked', async () => {
		const repo = new FakeBreakActivityRepository([physicalActivity, mindfulActivity]);
		const breaksState = createBreaksState(repo);
		await breaksState.load();
		breaksState.suggestForBreak('shortBreak-1');

		const initialTitle = breaksState.activeActivity?.title;

		const screen = await render(BreakRevitalization, {
			breaksState,
			mode: 'shortBreak',
			currentRound: 1,
			portalProps: { disabled: true }
		});

		const shuffleButton = screen.getByRole('button', { name: 'Shuffle break activity' });
		await expect.element(shuffleButton).toBeVisible();

		await shuffleButton.click();

		const newTitle = breaksState.activeActivity?.title;
		expect(newTitle).toBeDefined();
		expect(newTitle).not.toBe(initialTitle);
	});

	it('calls breaksState.load() on mount', async () => {
		const repo = new FakeBreakActivityRepository([physicalActivity]);
		const breaksState = createBreaksState(repo);
		const loadSpy = vi.spyOn(breaksState, 'load');

		await render(BreakRevitalization, {
			breaksState,
			mode: 'shortBreak',
			currentRound: 1,
			portalProps: { disabled: true }
		});

		expect(loadSpy).toHaveBeenCalled();
	});

	it('suggests an activity in $effect when mode and currentRound are provided', async () => {
		const repo = new FakeBreakActivityRepository([physicalActivity]);
		const breaksState = createBreaksState(repo);
		await breaksState.load();
		const suggestSpy = vi.spyOn(breaksState, 'suggestForBreak');

		await render(BreakRevitalization, {
			breaksState,
			mode: 'shortBreak',
			currentRound: 2,
			portalProps: { disabled: true }
		});

		expect(suggestSpy).toHaveBeenCalledWith('shortBreak-2');
	});
});
