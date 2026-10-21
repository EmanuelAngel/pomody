import { describe, it, expect } from 'vitest';
import { render } from 'vitest-browser-svelte';
import BehaviorPanel from './behavior-panel.svelte';
import { TimerFSM } from '$lib/domain/timer/timer-fsm';
import * as m from '$lib/paraglide/messages';
import { createBlockNoticeState } from '$lib/state/block-notice.svelte';
import { FakeBlockNotifier } from '$tests/fakes/platform/fake-block-notifier';
import { FakeSettingsStorage } from '$tests/fakes/repositories/fake-settings-storage';

function createState(options: { enabled?: boolean; permissionGranted?: boolean } = {}) {
	const notifier = new FakeBlockNotifier({
		permissionGranted: options.permissionGranted ?? true
	});

	const state = createBlockNoticeState({
		timer: new TimerFSM(),
		settingsStorage: new FakeSettingsStorage({
			blockNotificationsEnabled: options.enabled ?? true
		}),
		notifier,
		isWindowUnattended: () => true,
		isAlwaysOnTop: () => false
	});

	return { state, notifier };
}

describe('BehaviorPanel block notifications (Client Browser)', () => {
	it('should render the block-end switch on when the preference is on', async () => {
		const { state } = createState();

		const screen = await render(BehaviorPanel, { blockNoticeState: state });
		const toggle = screen.getByRole('switch', { name: m.settings_block_notifications_aria() });

		await expect.element(toggle).toHaveAttribute('aria-checked', 'true');
	});

	it('should turn the switch back off and explain the denial when the OS refuses', async () => {
		const { state, notifier } = createState({ enabled: false, permissionGranted: false });

		const screen = await render(BehaviorPanel, { blockNoticeState: state });
		const toggle = screen.getByRole('switch', { name: m.settings_block_notifications_aria() });

		await toggle.click();

		expect(notifier.requestPermissionCalls).toBe(1);
		await expect.element(toggle).toHaveAttribute('aria-checked', 'false');
		await expect
			.element(screen.getByText(m.settings_block_notifications_permission_denied()))
			.toBeVisible();
	});

	it('should hide the denial explanation until the OS actually refuses', async () => {
		const { state } = createState();

		const screen = await render(BehaviorPanel, { blockNoticeState: state });

		expect(screen.container.textContent).not.toContain(
			m.settings_block_notifications_permission_denied()
		);
	});
});
