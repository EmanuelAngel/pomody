import { describe, it, expect, vi } from 'vitest';
import { render } from 'vitest-browser-svelte';
import BreakCard from './break-card.svelte';
import { createBreakActivity, type BreakActivity } from '$lib/domain/breaks/break-activity.entity';

const physicalActivity: BreakActivity = createBreakActivity({
	id: 'act-phys',
	title: 'Neck & Shoulder Release',
	category: 'physical',
	durationMinutes: 2,
	isPreset: true,
	guide: '1. Tilt ear to shoulder.\n2. Repeat other side.\n3. Roll shoulders.'
});

const mindfulActivity: BreakActivity = createBreakActivity({
	id: 'act-mind',
	title: 'Box Breathing Focus',
	category: 'mindful',
	durationMinutes: 3,
	isPreset: false,
	guide: '1. Inhale 4s.\n2. Hold 4s.\n3. Exhale 4s.'
});

const hydrationActivity: BreakActivity = createBreakActivity({
	id: 'act-hydr',
	title: 'Hydrate with Fresh Water',
	category: 'hydration',
	durationMinutes: 1,
	isPreset: true
});

describe('BreakCard (Client Browser)', () => {
	it('renders physical activity with gold accent badge, duration pill, and no redundant preset badge', async () => {
		const screen = await render(BreakCard, { activity: physicalActivity });

		await expect.element(screen.getByText('Neck & Shoulder Release')).toBeVisible();
		await expect.element(screen.getByText('Physical')).toBeVisible();
		await expect.element(screen.getByText('2m')).toBeVisible();
		await expect.element(screen.getByText('Preset')).not.toBeInTheDocument();

		const badge = screen.getByText('Physical').element().parentElement;
		expect(badge?.className).toContain('text-accent-gold');
		expect(badge?.className).toContain('bg-accent-gold/15');
		expect(badge?.className).toContain('border-accent-gold/40');
	});

	it('renders mindful activity with iris accent badge without redundant status badge', async () => {
		const screen = await render(BreakCard, { activity: mindfulActivity });

		await expect.element(screen.getByText('Box Breathing Focus')).toBeVisible();
		await expect.element(screen.getByText('Mindful')).toBeVisible();
		await expect.element(screen.getByText('3m')).toBeVisible();
		await expect.element(screen.getByText('Custom')).not.toBeInTheDocument();

		const badge = screen.getByText('Mindful').element().parentElement;
		expect(badge?.className).toContain('text-accent-iris');
		expect(badge?.className).toContain('bg-accent-iris/15');
		expect(badge?.className).toContain('border-accent-iris/40');
	});

	it('renders hydration activity with foam accent badge', async () => {
		const screen = await render(BreakCard, { activity: hydrationActivity });

		await expect.element(screen.getByText('Hydrate with Fresh Water')).toBeVisible();
		await expect.element(screen.getByText('Hydration')).toBeVisible();
		await expect.element(screen.getByText('1m')).toBeVisible();

		const badge = screen.getByText('Hydration').element().parentElement;
		expect(badge?.className).toContain('text-accent-foam');
		expect(badge?.className).toContain('bg-accent-foam/15');
		expect(badge?.className).toContain('border-accent-foam/40');
	});

	it('renders expandable micro-guide when guide is present and toggles on click', async () => {
		const screen = await render(BreakCard, { activity: physicalActivity });

		const expandButton = screen.getByRole('button', {
			name: `Show guide for ${physicalActivity.title}`
		});
		await expect.element(expandButton).toBeVisible();
		expect(expandButton.element().getAttribute('aria-expanded')).toBe('false');

		// Guide content should not be present initially
		await expect.element(screen.getByText(/1\. Tilt ear to shoulder/)).not.toBeInTheDocument();

		// Click to expand
		await expandButton.click();

		const collapseButton = screen.getByRole('button', {
			name: `Hide guide for ${physicalActivity.title}`
		});
		await expect.element(collapseButton).toBeVisible();
		expect(collapseButton.element().getAttribute('aria-expanded')).toBe('true');
		await expect.element(screen.getByText(/1\. Tilt ear to shoulder/)).toBeVisible();
		await expect.element(screen.getByText(/2\. Repeat other side/)).toBeVisible();

		// Click to collapse
		await collapseButton.click();

		await expect.element(expandButton).toBeVisible();
		expect(expandButton.element().getAttribute('aria-expanded')).toBe('false');
		await expect.element(screen.getByText(/1\. Tilt ear to shoulder/)).not.toBeInTheDocument();
	});

	it('does not render guide toggle button when activity has no guide', async () => {
		const screen = await render(BreakCard, { activity: hydrationActivity });

		await expect.element(screen.getByRole('button', { name: /guide/i })).not.toBeInTheDocument();
	});

	it('does not render edit or delete buttons for preset activities even if callbacks are passed', async () => {
		const onEdit = vi.fn();
		const onDelete = vi.fn();

		const screen = await render(BreakCard, {
			activity: physicalActivity, // isPreset: true
			onEdit,
			onDelete
		});

		await expect
			.element(screen.getByRole('button', { name: `Edit habit: ${physicalActivity.title}` }))
			.not.toBeInTheDocument();
		await expect
			.element(screen.getByRole('button', { name: `Delete habit: ${physicalActivity.title}` }))
			.not.toBeInTheDocument();
	});

	it('renders edit and delete buttons for custom habits and invokes callbacks', async () => {
		const onEdit = vi.fn();
		const onDelete = vi.fn();

		const screen = await render(BreakCard, {
			activity: mindfulActivity, // isPreset: false
			onEdit,
			onDelete
		});

		const editBtn = screen.getByRole('button', {
			name: `Edit habit: ${mindfulActivity.title}`
		});
		const deleteBtn = screen.getByRole('button', {
			name: `Delete habit: ${mindfulActivity.title}`
		});

		await expect.element(editBtn).toBeVisible();
		await expect.element(deleteBtn).toBeVisible();

		await editBtn.click();
		expect(onEdit).toHaveBeenCalledTimes(1);
		expect(onEdit).toHaveBeenCalledWith(mindfulActivity);

		await deleteBtn.click();
		expect(onDelete).toHaveBeenCalledTimes(1);
		expect(onDelete).toHaveBeenCalledWith(mindfulActivity);
	});
});
