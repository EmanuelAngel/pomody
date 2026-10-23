import { describe, it, expect, vi, afterEach } from 'vitest';
import { render } from 'vitest-browser-svelte';
import UpdatesPanel from './updates-panel.svelte';
import { createUpdateState } from '$lib/state/update.svelte';
import { FakeUpdateChecker } from '$tests/fakes/platform/fake-update-checker';
import type { UpdateInfo } from '$lib/domain/ports/update-checker.port';
import type { TimerState as TimerFsmState } from '$lib/domain/timer/timer-fsm';

const UPDATE: UpdateInfo = {
	version: '0.20.0',
	notes: '### Features\n- Auto update',
	publishedAt: '2026-10-23T12:00:00Z'
};

function createHarness(options: { isSupported?: boolean; timerState?: TimerFsmState } = {}) {
	const checker = new FakeUpdateChecker({ isSupported: options.isSupported });
	const timer = { state: options.timerState ?? ('idle' as TimerFsmState) };
	const updateState = createUpdateState({ checker, timer });

	return { checker, timer, updateState };
}

describe('UpdatesPanel (Client Browser)', () => {
	afterEach(() => {
		vi.restoreAllMocks();
	});

	it('renders nothing on a platform that cannot update', async () => {
		const { updateState } = createHarness({ isSupported: false });

		const screen = await render(UpdatesPanel, { updateState });

		expect(screen.getByRole('heading', { name: 'Updates' }).query()).toBeNull();
		expect(screen.getByRole('button', { name: 'Update now' }).query()).toBeNull();
	});

	it('shows the version and the release notes of the available update', async () => {
		const { checker, updateState } = createHarness();
		checker.nextCheck = UPDATE;
		await updateState.checkNow();

		const screen = await render(UpdatesPanel, { updateState });

		await expect.element(screen.getByText('Version 0.20.0 is available.')).toBeVisible();
		await expect.element(screen.getByText('Auto update')).toBeVisible();
	});

	it('disables the install and explains why while a focus block is running', async () => {
		const { checker, updateState } = createHarness({ timerState: 'running' });
		checker.nextCheck = UPDATE;
		await updateState.checkNow();

		const screen = await render(UpdatesPanel, { updateState });
		const installButton = screen.getByRole('button', { name: 'Update now' });

		await expect.element(installButton).toBeDisabled();
		await expect
			.element(screen.getByText('Pomody cannot install an update while a block is in progress.'))
			.toBeVisible();
	});

	it('disables the install and explains why while a block is paused', async () => {
		const { checker, updateState } = createHarness({ timerState: 'paused' });
		checker.nextCheck = UPDATE;
		await updateState.checkNow();

		const screen = await render(UpdatesPanel, { updateState });
		const installButton = screen.getByRole('button', { name: 'Update now' });

		await expect.element(installButton).toBeDisabled();
		await expect
			.element(screen.getByText('Pomody cannot install an update while a block is in progress.'))
			.toBeVisible();
	});

	it('asks the checker to install exactly once per click', async () => {
		const { checker, updateState } = createHarness();
		checker.nextCheck = UPDATE;
		await updateState.checkNow();

		const screen = await render(UpdatesPanel, { updateState });

		await screen.getByRole('button', { name: 'Update now' }).click();

		await expect.poll(() => checker.installCalls).toBe(1);
	});

	it('shows an installing state while the download is in flight', async () => {
		const { checker, updateState } = createHarness();
		checker.nextCheck = UPDATE;
		await updateState.checkNow();
		vi.spyOn(checker, 'installPending').mockImplementation(() => new Promise(() => {}));

		const screen = await render(UpdatesPanel, { updateState });

		await screen.getByRole('button', { name: 'Update now' }).click();

		await expect.element(screen.getByText('Installing update…')).toBeVisible();
		await expect.element(screen.getByRole('button', { name: 'Update now' })).toBeDisabled();
	});

	it('reports a failed install and lets the user try again', async () => {
		const { checker, updateState } = createHarness();
		checker.nextCheck = UPDATE;
		await updateState.checkNow();
		checker.nextInstall = new Error('download failed');
		await updateState.install();

		const screen = await render(UpdatesPanel, { updateState });

		await expect
			.element(screen.getByText('The update could not be installed. Try again.'))
			.toBeVisible();
		await expect.element(screen.getByRole('button', { name: 'Update now' })).toBeEnabled();
	});

	it('asks the checker once when the user asks for a manual check', async () => {
		const { checker, updateState } = createHarness();

		const screen = await render(UpdatesPanel, { updateState });

		await screen.getByRole('button', { name: 'Check for updates' }).click();

		await expect.poll(() => checker.checkCalls).toBe(1);
	});

	it('shows the checking state while a manual check is in flight', async () => {
		const { checker, updateState } = createHarness();
		checker.holdCheck();

		const screen = await render(UpdatesPanel, { updateState });

		await screen.getByRole('button', { name: 'Check for updates' }).click();

		await expect.element(screen.getByText('Checking for updates…')).toBeVisible();
		checker.releaseCheck();
	});

	it('says the app is up to date when a check finds nothing newer', async () => {
		const { checker, updateState } = createHarness();
		checker.nextCheck = null;
		await updateState.checkNow();

		const screen = await render(UpdatesPanel, { updateState });

		await expect.element(screen.getByText('Pomody is up to date.')).toBeVisible();
	});

	it('says the check failed when the update feed cannot be reached', async () => {
		const { checker, updateState } = createHarness();
		checker.nextCheck = new Error('network down');
		await updateState.checkNow();

		const screen = await render(UpdatesPanel, { updateState });

		await expect.element(screen.getByText('The update check failed. Try again.')).toBeVisible();
	});
});
