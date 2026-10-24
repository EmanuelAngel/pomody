import { describe, it, expect } from 'vitest';
import { TimerFSM } from '$lib/domain/timer/timer-fsm';
import * as m from '$lib/paraglide/messages';
import { FakeBlockNotifier } from '$tests/fakes/platform/fake-block-notifier';
import { FakeBlockToast } from '$tests/fakes/platform/fake-block-toast';
import { FakeSettingsStorage } from '$tests/fakes/repositories/fake-settings-storage';
import { createBlockNoticeState } from './block-notice.svelte';

/** Lets the promises the state fires without awaiting settle before the assertion. */
async function flush(): Promise<void> {
	await Promise.resolve();
	await Promise.resolve();
}

function createHarness(
	options: {
		enabled?: boolean;
		notifier?: FakeBlockNotifier;
		unattended?: boolean;
		alwaysOnTop?: boolean;
		roundsBeforeLongBreak?: number;
	} = {}
) {
	const settingsStorage = new FakeSettingsStorage({
		blockNotificationsEnabled: options.enabled ?? true
	});
	const notifier = options.notifier ?? new FakeBlockNotifier();
	const toast = new FakeBlockToast();
	const timer = new TimerFSM({ roundsBeforeLongBreak: options.roundsBeforeLongBreak ?? 4 });
	const state = createBlockNoticeState({
		settingsStorage,
		notifier,
		toast,
		timer,
		isWindowUnattended: () => options.unattended ?? true,
		isAlwaysOnTop: () => options.alwaysOnTop ?? false
	});

	return { state, notifier, toast, settingsStorage, timer };
}

/** Runs one block of the timer to its natural end, which is what emits `block-completed`. */
function completeBlock(timer: TimerFSM): void {
	timer.start();
	timer.tick(timer.durationMs);
}

describe('BlockNoticeState', () => {
	describe('seeding', () => {
		it('should start enabled when the persisted preference is on', () => {
			const { state } = createHarness({ enabled: true });

			expect(state.enabled).toBe(true);
			expect(state.permissionDenied).toBe(false);
		});

		it('should start disabled when the persisted preference is off', () => {
			const { state } = createHarness({ enabled: false });

			expect(state.enabled).toBe(false);
		});
	});

	describe('setEnabled', () => {
		it('should keep the switch on and persist it when the OS grants the permission', async () => {
			const { state, notifier, settingsStorage } = createHarness({ enabled: false });

			state.setEnabled(true);
			await flush();

			expect(notifier.requestPermissionCalls).toBe(1);
			expect(state.enabled).toBe(true);
			expect(state.permissionDenied).toBe(false);
			expect(settingsStorage.loadSettings().blockNotificationsEnabled).toBe(true);
		});

		it('should turn the switch back off and flag the denial when the OS refuses', async () => {
			const notifier = new FakeBlockNotifier({ permissionGranted: false });
			const { state, settingsStorage } = createHarness({ enabled: false, notifier });

			state.setEnabled(true);
			await flush();

			expect(state.enabled).toBe(false);
			expect(state.permissionDenied).toBe(true);
			expect(settingsStorage.loadSettings().blockNotificationsEnabled).toBe(false);
		});

		it('should not ask for a permission the platform cannot grant', async () => {
			const web = new FakeBlockNotifier({ isSupported: false });
			const { state, settingsStorage } = createHarness({ enabled: false, notifier: web });

			state.setEnabled(true);
			await flush();

			expect(web.requestPermissionCalls).toBe(0);
			expect(state.enabled).toBe(true);
			expect(state.permissionDenied).toBe(false);
			expect(settingsStorage.loadSettings().blockNotificationsEnabled).toBe(true);
		});

		it('should clear the denial flag once the OS grants the permission on a later attempt', async () => {
			const notifier = new FakeBlockNotifier({ permissionGranted: false });
			const { state } = createHarness({ enabled: false, notifier });

			state.setEnabled(true);
			await flush();

			notifier.permissionGranted = true;
			state.setEnabled(true);
			await flush();

			expect(state.enabled).toBe(true);
			expect(state.permissionDenied).toBe(false);
		});

		it('should persist the switch off and clear the denial flag when the user disables it', async () => {
			const notifier = new FakeBlockNotifier({ permissionGranted: false });
			const { state, settingsStorage } = createHarness({ enabled: false, notifier });
			state.setEnabled(true);
			await flush();

			state.setEnabled(false);

			expect(state.enabled).toBe(false);
			expect(state.permissionDenied).toBe(false);
			expect(settingsStorage.loadSettings().blockNotificationsEnabled).toBe(false);
		});
	});

	describe('in-app toast', () => {
		it('should show the same notice in the toast as on the OS channel', async () => {
			const { notifier, toast, timer } = createHarness();

			completeBlock(timer);
			await flush();

			expect(toast.shown).toEqual(notifier.notifyCalls);
		});

		it('should dismiss the toast when the next block starts', async () => {
			const { toast, timer } = createHarness();
			completeBlock(timer);

			timer.start();

			expect(toast.dismissed).toEqual([1]);
		});

		it('should dismiss the toast when the timer resets', async () => {
			const { toast, timer } = createHarness();
			completeBlock(timer);

			timer.reset();

			expect(toast.dismissed).toEqual([1]);
		});

		it('should dismiss the toast when the completed block is skipped', async () => {
			const { toast, timer } = createHarness();
			completeBlock(timer);

			timer.skip();

			expect(toast.dismissed).toEqual([1]);
		});

		it('should not stack notices: a new one replaces the previous toast', async () => {
			const { toast, timer } = createHarness();
			completeBlock(timer);
			timer.start();

			completeBlock(timer);

			expect(toast.shown).toHaveLength(2);
			expect(toast.dismissed).toEqual([1]);
		});

		it('should say nothing while the window is in front', async () => {
			const { toast, timer } = createHarness({ unattended: false });

			completeBlock(timer);

			expect(toast.shown).toEqual([]);
		});

		it('should say nothing while an always-on-top window shows the phase change', async () => {
			const { toast, timer } = createHarness({ alwaysOnTop: true });

			completeBlock(timer);

			expect(toast.shown).toEqual([]);
		});

		it('should say nothing while the switch is off', async () => {
			const { toast, timer } = createHarness({ enabled: false });

			completeBlock(timer);

			expect(toast.shown).toEqual([]);
		});

		it('should survive a failing toast without touching the timer', async () => {
			const { toast, timer } = createHarness();
			toast.show = () => {
				throw new Error('toast host exploded');
			};

			expect(() => completeBlock(timer)).not.toThrow();
			expect(timer.state).toBe('completed');
		});
	});

	describe('block completion', () => {
		it('should notify the finished focus block and the short break that follows', async () => {
			const { notifier, timer } = createHarness();

			completeBlock(timer);
			await flush();

			expect(notifier.notifyCalls).toEqual([
				{ title: m.block_notice_title_focus(), body: m.block_notice_body_short_break() }
			]);
		});

		it('should notify the long break when the finished focus round closes the cycle', async () => {
			const { notifier, timer } = createHarness({ roundsBeforeLongBreak: 1 });

			completeBlock(timer);
			await flush();

			expect(notifier.notifyCalls).toEqual([
				{ title: m.block_notice_title_focus(), body: m.block_notice_body_long_break() }
			]);
		});

		it('should notify the way back to focus when a short break completes', async () => {
			const { notifier, timer } = createHarness();
			completeBlock(timer);

			completeBlock(timer);
			await flush();

			expect(notifier.notifyCalls[1]).toEqual({
				title: m.block_notice_title_short_break(),
				body: m.block_notice_body_focus()
			});
		});

		it('should notify the way back to focus when a long break completes', async () => {
			const { notifier, timer } = createHarness({ roundsBeforeLongBreak: 1 });
			completeBlock(timer);

			completeBlock(timer);
			await flush();

			expect(notifier.notifyCalls[1]).toEqual({
				title: m.block_notice_title_long_break(),
				body: m.block_notice_body_focus()
			});
		});

		it('should say nothing while the window is in front', async () => {
			const { notifier, timer } = createHarness({ unattended: false });

			completeBlock(timer);
			await flush();

			expect(notifier.notifyCalls).toEqual([]);
		});

		it('should say nothing while an always-on-top window shows the phase change', async () => {
			const { notifier, timer } = createHarness({ alwaysOnTop: true });

			completeBlock(timer);
			await flush();

			expect(notifier.notifyCalls).toEqual([]);
		});

		it('should say nothing while the switch is off', async () => {
			const { notifier, timer } = createHarness({ enabled: false });

			completeBlock(timer);
			await flush();

			expect(notifier.notifyCalls).toEqual([]);
		});

		it('should say nothing when the block is skipped instead of completing', async () => {
			const { notifier, timer } = createHarness();

			timer.start();
			timer.skip();
			await flush();

			expect(notifier.notifyCalls).toEqual([]);
		});

		it('should say nothing when a block in progress is abandoned with a reset', async () => {
			const { notifier, timer } = createHarness();

			timer.start();
			timer.tick(1000);
			timer.reset();
			await flush();

			expect(notifier.notifyCalls).toEqual([]);
		});

		it('should survive a failing notifier without touching the timer', async () => {
			const { notifier, timer } = createHarness();
			notifier.notify = async () => {
				throw new Error('toast backend exploded');
			};

			expect(() => completeBlock(timer)).not.toThrow();
			await flush();

			expect(timer.state).toBe('completed');
		});
	});
});
