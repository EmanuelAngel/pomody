import { describe, it, expect, vi } from 'vitest';
import { render } from 'vitest-browser-svelte';
import { userEvent } from 'vitest/browser';
import DistractionRuleForm from './distraction-rule-form.svelte';
import type { DistractionRuleInput } from '$lib/state/distractionState.svelte';
import type { DistractionRule } from '$lib/domain/distraction/distraction-rule.entity';

const WINDOWS = [
	{ exe: 'chrome', title: 'YouTube — Google Chrome' },
	{ exe: 'steam', title: 'Steam' }
];

describe('DistractionRuleForm (Client Browser)', () => {
	it('prefills the executable and the title pattern from the picked window, both editable', async () => {
		const onSave = vi.fn<(input: DistractionRuleInput) => Promise<boolean>>(async () => true);
		const screen = await render(DistractionRuleForm, {
			windows: WINDOWS,
			onSave,
			portalProps: { disabled: true }
		});

		await screen.getByRole('button', { name: 'Open windows' }).click();
		await expect
			.element(screen.getByRole('option', { name: 'YouTube — Google Chrome' }))
			.toBeVisible();
		await screen.getByRole('option', { name: 'YouTube — Google Chrome' }).click();

		const exe = screen.getByLabelText('Executable');
		const pattern = screen.getByLabelText('Title pattern');
		await expect.element(exe).toHaveValue('chrome');
		await expect.element(pattern).toHaveValue('YouTube — Google Chrome');

		await userEvent.clear(pattern);
		await userEvent.type(pattern, 'YouTube');
		await userEvent.clear(exe);
		await userEvent.type(exe, 'chrome.exe');
		await screen.getByRole('button', { name: 'Add rule' }).click();

		expect(onSave).toHaveBeenCalledTimes(1);
		expect(onSave.mock.calls[0][0]).toEqual({ exe: 'chrome.exe', titlePattern: 'YouTube' });
	});

	it('offers the manual escape when the platform enumerated no window', async () => {
		const onSave = vi.fn<(input: DistractionRuleInput) => Promise<boolean>>(async () => true);
		const screen = await render(DistractionRuleForm, {
			windows: [],
			onSave,
			portalProps: { disabled: true }
		});

		expect(screen.container.querySelector('[data-slot="select-trigger"]')).toBeNull();
		await expect
			.element(
				screen.getByText('No windows to pick from: declare it by hand with the fields below.')
			)
			.toBeVisible();

		await userEvent.type(screen.getByLabelText('Executable'), 'steam');
		await screen.getByRole('button', { name: 'Add rule' }).click();

		expect(onSave).toHaveBeenCalledWith({ exe: 'steam' });
	});

	it('keeps the submit disabled until the executable has a usable value', async () => {
		const onSave = vi.fn<(input: DistractionRuleInput) => Promise<boolean>>(async () => true);
		const screen = await render(DistractionRuleForm, {
			windows: WINDOWS,
			onSave,
			portalProps: { disabled: true }
		});

		const submit = screen.getByRole('button', { name: 'Add rule' });
		await expect.element(submit).toBeDisabled();

		await userEvent.type(screen.getByLabelText('Executable'), '   ');
		await expect.element(submit).toBeDisabled();

		await userEvent.type(screen.getByLabelText('Executable'), 'chrome');
		await expect.element(submit).not.toBeDisabled();
		expect(onSave).not.toHaveBeenCalled();
	});

	it('edits an existing rule, keeping its id, and cancels back to the declaration form', async () => {
		const rule: DistractionRule = {
			id: 'rule-7',
			exe: 'chrome',
			titlePattern: 'Reddit',
			createdAt: 1
		};
		const onSave = vi.fn<(input: DistractionRuleInput) => Promise<boolean>>(async () => true);
		const onCancel = vi.fn();

		const screen = await render(DistractionRuleForm, {
			windows: WINDOWS,
			editingRule: rule,
			onSave,
			onCancel,
			portalProps: { disabled: true }
		});

		await expect.element(screen.getByLabelText('Executable')).toHaveValue('chrome');
		await expect.element(screen.getByLabelText('Title pattern')).toHaveValue('Reddit');

		await userEvent.clear(screen.getByLabelText('Title pattern'));
		await userEvent.type(screen.getByLabelText('Title pattern'), 'reddit.com');
		await screen.getByRole('button', { name: 'Save changes' }).click();

		expect(onSave).toHaveBeenCalledWith({
			id: 'rule-7',
			exe: 'chrome',
			titlePattern: 'reddit.com'
		});

		await screen.getByRole('button', { name: 'Cancel' }).click();
		expect(onCancel).toHaveBeenCalledTimes(1);
	});
});
