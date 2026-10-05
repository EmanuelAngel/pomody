import { describe, it, expect, vi, afterEach } from 'vitest';
import { render } from 'vitest-browser-svelte';
import BreakConfirmDialog from './break-confirm-dialog.svelte';
import { localeState } from '$lib/state/locale.svelte';

describe('BreakConfirmDialog (Client Browser)', () => {
	afterEach(async () => {
		await new Promise((resolve) => setTimeout(resolve, 0));
	});

	it('renders title and description when open={true}', async () => {
		const screen = await render(BreakConfirmDialog, {
			open: true,
			title: 'Delete custom habit?',
			description: 'Delete custom habit? This cannot be undone.',
			confirmLabel: 'Delete',
			cancelLabel: 'Cancel',
			onConfirm: vi.fn(),
			portalProps: { disabled: true }
		});

		await expect
			.element(screen.getByRole('heading', { name: 'Delete custom habit?' }))
			.toBeVisible();
		await expect
			.element(screen.getByText('Delete custom habit? This cannot be undone.'))
			.toBeVisible();
		await expect.element(screen.getByRole('button', { name: 'Delete' })).toBeVisible();
		await expect.element(screen.getByRole('button', { name: 'Cancel' })).toBeVisible();
	});

	it('does not render dialog content when open={false}', async () => {
		const screen = await render(BreakConfirmDialog, {
			open: false,
			title: 'Reset catalog to defaults?',
			description: 'All custom habits will be removed.',
			onConfirm: vi.fn(),
			portalProps: { disabled: true }
		});

		await expect.element(screen.getByText('Reset catalog to defaults?')).not.toBeInTheDocument();
	});

	it('calls onConfirm callback when confirm button is clicked', async () => {
		const onConfirm = vi.fn();
		const screen = await render(BreakConfirmDialog, {
			open: true,
			title: 'Reset catalog to defaults?',
			description: 'Restore presets?',
			confirmLabel: 'Reset',
			onConfirm,
			portalProps: { disabled: true }
		});

		const confirmButton = screen.getByRole('button', { name: 'Reset' });
		await confirmButton.click();

		expect(onConfirm).toHaveBeenCalledTimes(1);
	});

	it('calls onCancel callback when cancel button is clicked', async () => {
		const onCancel = vi.fn();
		const screen = await render(BreakConfirmDialog, {
			open: true,
			title: 'Delete custom habit?',
			description: 'This cannot be undone.',
			cancelLabel: 'Keep Habit',
			onConfirm: vi.fn(),
			onCancel,
			portalProps: { disabled: true }
		});

		const cancelButton = screen.getByRole('button', { name: 'Keep Habit' });
		await cancelButton.click();

		expect(onCancel).toHaveBeenCalledTimes(1);
	});

	it('uses localized default confirm and cancel labels and reactively updates on locale change', async () => {
		const screen = await render(BreakConfirmDialog, {
			open: true,
			title: 'Test Title',
			description: 'Test Description',
			onConfirm: vi.fn(),
			portalProps: { disabled: true }
		});

		await expect.element(screen.getByRole('button', { name: 'Confirm' })).toBeVisible();
		await expect.element(screen.getByRole('button', { name: 'Cancel' })).toBeVisible();

		localeState.setLocale('es');

		await expect.element(screen.getByRole('button', { name: 'Confirmar' })).toBeVisible();
		await expect.element(screen.getByRole('button', { name: 'Cancelar' })).toBeVisible();

		localeState.setLocale('en');

		await expect.element(screen.getByRole('button', { name: 'Confirm' })).toBeVisible();
		await expect.element(screen.getByRole('button', { name: 'Cancel' })).toBeVisible();
	});
});
