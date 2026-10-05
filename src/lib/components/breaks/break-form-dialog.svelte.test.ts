import { describe, it, expect, vi } from 'vitest';
import { render } from 'vitest-browser-svelte';
import BreakFormDialog from './break-form-dialog.svelte';
import { localeState } from '$lib/state/locale.svelte';
import { createBreakActivity, type BreakActivity } from '$lib/domain/breaks/break-activity.entity';

const sampleCustomActivity: BreakActivity = createBreakActivity({
	id: 'custom-act-1',
	title: 'Shoulder Rolls',
	category: 'physical',
	durationMinutes: 3,
	isPreset: false,
	guide: '1. Roll backward 5 times.\n2. Roll forward 5 times.'
});

describe('BreakFormDialog (Client Browser)', () => {
	describe('Creation Mode', () => {
		it('renders creation mode with initial defaults and disabled submit when title is empty', async () => {
			const screen = await render(BreakFormDialog, {
				open: true,
				activity: null,
				onSave: vi.fn(),
				portalProps: { disabled: true }
			});

			await expect.element(screen.getByText('New Break Habit')).toBeVisible();
			await expect
				.element(
					screen.getByText('Add a custom restorative habit with duration and optional guidance.')
				)
				.toBeVisible();

			const titleInput = screen.getByLabelText(/Title/);
			await expect.element(titleInput).toBeVisible();
			await expect.element(titleInput).toHaveValue('');

			const durationInput = screen.getByLabelText(/Duration/);
			await expect.element(durationInput).toHaveValue(5);

			const submitBtn = screen.getByRole('button', { name: 'Create Habit' });
			await expect.element(submitBtn).toBeDisabled();
		});

		it('validates required fields, prevents submit with whitespace-only title', async () => {
			const onSave = vi.fn();
			const screen = await render(BreakFormDialog, {
				open: true,
				activity: null,
				onSave,
				portalProps: { disabled: true }
			});

			const titleInput = screen.getByLabelText(/Title/);
			await titleInput.fill('    ');

			const submitBtn = screen.getByRole('button', { name: 'Create Habit' });
			await expect.element(submitBtn).toBeDisabled();
			expect(onSave).not.toHaveBeenCalled();

			await expect.element(screen.getByText('Title is required.')).toBeVisible();
			expect(titleInput.element().getAttribute('aria-invalid')).toBe('true');
		});

		it('submits valid habit data on form completion', async () => {
			const onSave = vi.fn();
			const screen = await render(BreakFormDialog, {
				open: true,
				activity: null,
				onSave,
				portalProps: { disabled: true }
			});

			const titleInput = screen.getByLabelText(/Title/);
			await titleInput.fill('Desk Yoga Stretches');

			const mindfulChip = screen.getByRole('radio', { name: 'Mindful' });
			await mindfulChip.click();
			expect(mindfulChip.element().getAttribute('aria-checked')).toBe('true');

			const durationInput = screen.getByLabelText(/Duration/);
			await durationInput.fill('4');

			const guideInput = screen.getByLabelText(/Micro-Guide/);
			await guideInput.fill('1. Inhale deeply.\n2. Stretch arms upward.');

			const submitBtn = screen.getByRole('button', { name: 'Create Habit' });
			await expect.element(submitBtn).not.toBeDisabled();

			await submitBtn.click();

			expect(onSave).toHaveBeenCalledTimes(1);
			expect(onSave).toHaveBeenCalledWith({
				title: 'Desk Yoga Stretches',
				category: 'mindful',
				durationMinutes: 4,
				guide: '1. Inhale deeply.\n2. Stretch arms upward.',
				isPreset: false
			});
		});
	});

	describe('Edit Mode', () => {
		it('populates fields with existing activity data and saves updates', async () => {
			const onSave = vi.fn();
			const screen = await render(BreakFormDialog, {
				open: true,
				activity: sampleCustomActivity,
				onSave,
				portalProps: { disabled: true }
			});

			await expect.element(screen.getByText('Edit Break Habit')).toBeVisible();

			const titleInput = screen.getByLabelText(/Title/);
			await expect.element(titleInput).toHaveValue('Shoulder Rolls');

			const durationInput = screen.getByLabelText(/Duration/);
			await expect.element(durationInput).toHaveValue(3);

			const physicalChip = screen.getByRole('radio', { name: 'Physical' });
			expect(physicalChip.element().getAttribute('aria-checked')).toBe('true');

			const submitBtn = screen.getByRole('button', { name: 'Save Changes' });
			await expect.element(submitBtn).not.toBeDisabled();

			// Update title
			await titleInput.fill('Gentle Shoulder Rolls');
			await submitBtn.click();

			expect(onSave).toHaveBeenCalledTimes(1);
			expect(onSave).toHaveBeenCalledWith({
				id: sampleCustomActivity.id,
				title: 'Gentle Shoulder Rolls',
				category: 'physical',
				durationMinutes: 3,
				guide: '1. Roll backward 5 times.\n2. Roll forward 5 times.',
				isPreset: false
			});
		});
	});

	describe('Validation Constraints', () => {
		it('enforces title <= 120 chars and shows character counter', async () => {
			const screen = await render(BreakFormDialog, {
				open: true,
				activity: null,
				onSave: vi.fn(),
				portalProps: { disabled: true }
			});

			const titleInput = screen.getByLabelText(/Title/);
			const longTitle = 'A'.repeat(121);
			await titleInput.fill(longTitle);

			await expect.element(screen.getByText('Title cannot exceed 120 characters.')).toBeVisible();
			expect(titleInput.element().getAttribute('aria-invalid')).toBe('true');

			const submitBtn = screen.getByRole('button', { name: 'Create Habit' });
			await expect.element(submitBtn).toBeDisabled();

			// Fix title to 120 chars
			await titleInput.fill('A'.repeat(120));
			await expect
				.element(screen.getByText('Title cannot exceed 120 characters.'))
				.not.toBeInTheDocument();
			await expect.element(submitBtn).not.toBeDisabled();
		});

		it('enforces duration >= 1', async () => {
			const screen = await render(BreakFormDialog, {
				open: true,
				activity: null,
				onSave: vi.fn(),
				portalProps: { disabled: true }
			});

			const titleInput = screen.getByLabelText(/Title/);
			await titleInput.fill('Valid Title');

			const durationInput = screen.getByLabelText(/Duration/);
			await durationInput.fill('0');

			await expect.element(screen.getByText('Duration must be at least 1 minute.')).toBeVisible();
			expect(durationInput.element().getAttribute('aria-invalid')).toBe('true');

			const submitBtn = screen.getByRole('button', { name: 'Create Habit' });
			await expect.element(submitBtn).toBeDisabled();

			// Valid duration
			await durationInput.fill('2');
			await expect
				.element(screen.getByText('Duration must be at least 1 minute.'))
				.not.toBeInTheDocument();
			await expect.element(submitBtn).not.toBeDisabled();
		});

		it('enforces guide <= 500 chars and shows character counter indicator', async () => {
			const screen = await render(BreakFormDialog, {
				open: true,
				activity: null,
				onSave: vi.fn(),
				portalProps: { disabled: true }
			});

			const titleInput = screen.getByLabelText(/Title/);
			await titleInput.fill('Valid Title');

			const guideInput = screen.getByLabelText(/Micro-Guide/);
			const longGuide = 'X'.repeat(501);
			await guideInput.fill(longGuide);

			await expect.element(screen.getByText('Guide cannot exceed 500 characters.')).toBeVisible();
			expect(guideInput.element().getAttribute('aria-invalid')).toBe('true');

			const submitBtn = screen.getByRole('button', { name: 'Create Habit' });
			await expect.element(submitBtn).toBeDisabled();
		});

		it('invokes onCancel when Cancel button is clicked', async () => {
			const onCancel = vi.fn();
			const screen = await render(BreakFormDialog, {
				open: true,
				activity: null,
				onSave: vi.fn(),
				onCancel,
				portalProps: { disabled: true }
			});

			const cancelBtn = screen.getByRole('button', { name: 'Cancel' });
			await cancelBtn.click();

			expect(onCancel).toHaveBeenCalledTimes(1);
		});

		it('invokes onCancel when X close button is clicked', async () => {
			const onCancel = vi.fn();
			const screen = await render(BreakFormDialog, {
				open: true,
				activity: null,
				onSave: vi.fn(),
				onCancel,
				portalProps: { disabled: true }
			});

			const closeBtn = screen.getByRole('button', { name: 'Close' });
			await closeBtn.click();

			expect(onCancel).toHaveBeenCalledTimes(1);
		});

		it('reactively updates dialog title, labels, and buttons when switching locales', async () => {
			const screen = await render(BreakFormDialog, {
				open: true,
				activity: null,
				onSave: vi.fn(),
				portalProps: { disabled: true }
			});

			await expect.element(screen.getByText('New Break Habit')).toBeVisible();
			await expect.element(screen.getByRole('button', { name: 'Create Habit' })).toBeVisible();
			await expect.element(screen.getByText('Cancel')).toBeVisible();

			localeState.setLocale('es');

			await expect.element(screen.getByText('Nuevo hábito de descanso')).toBeVisible();
			await expect.element(screen.getByRole('button', { name: 'Crear hábito' })).toBeVisible();
			await expect.element(screen.getByText('Cancelar')).toBeVisible();

			localeState.setLocale('en');

			await expect.element(screen.getByText('New Break Habit')).toBeVisible();
			await expect.element(screen.getByRole('button', { name: 'Create Habit' })).toBeVisible();
		});
	});
});
