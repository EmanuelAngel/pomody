import { describe, it, expect, vi, afterEach } from 'vitest';
import type { UpdateInfo } from '$lib/domain/ports/update-checker.port';
import type { TimerState as TimerFsmState } from '$lib/domain/timer/timer-fsm';
import { UPDATE_CHECK_INTERVAL_MS } from '$lib/domain/updates/update-policy';
import { FakeUpdateChecker } from '$tests/fakes/platform/fake-update-checker';
import { createUpdateState } from './update.svelte';

const UPDATE: UpdateInfo = {
	version: '0.20.0',
	notes: '### Features\n- Auto update',
	publishedAt: '2026-10-23T12:00:00Z'
};

function createHarness(options: { isSupported?: boolean; timerState?: TimerFsmState } = {}) {
	const checker = new FakeUpdateChecker({ isSupported: options.isSupported });
	const timer = { state: options.timerState ?? ('idle' as TimerFsmState) };
	const state = createUpdateState({ checker, timer });

	return { state, checker, timer };
}

describe('UpdateState', () => {
	afterEach(() => {
		vi.useRealTimers();
	});

	describe('checkNow', () => {
		it('should expose the update the checker found', async () => {
			const { state, checker } = createHarness();
			checker.nextCheck = UPDATE;

			await state.checkNow();

			expect(state.info).toEqual(UPDATE);
			expect(state.hasUpdate).toBe(true);
			expect(state.upToDate).toBe(false);
			expect(state.lastCheckFailed).toBe(false);
		});

		it('should report up to date when the checker finds nothing', async () => {
			const { state } = createHarness();

			await state.checkNow();

			expect(state.info).toBeNull();
			expect(state.hasUpdate).toBe(false);
			expect(state.upToDate).toBe(true);
		});

		it('should not claim up to date before any check ran', () => {
			const { state } = createHarness();

			expect(state.upToDate).toBe(false);
		});

		it('should record a failed check without throwing and without claiming up to date', async () => {
			const { state, checker } = createHarness();
			checker.nextCheck = new Error('network down');

			await expect(state.checkNow()).resolves.toBeUndefined();

			expect(state.lastCheckFailed).toBe(true);
			expect(state.upToDate).toBe(false);
		});

		it('should keep an already found update when a later check fails', async () => {
			const { state, checker } = createHarness();
			checker.nextCheck = UPDATE;
			await state.checkNow();
			checker.nextCheck = new Error('network down');

			await state.checkNow();

			expect(state.info).toEqual(UPDATE);
			expect(state.lastCheckFailed).toBe(true);
		});

		it('should clear the failure flag once a check succeeds', async () => {
			const { state, checker } = createHarness();
			checker.nextCheck = new Error('network down');
			await state.checkNow();
			checker.nextCheck = null;

			await state.checkNow();

			expect(state.lastCheckFailed).toBe(false);
		});

		it('should be checking while the request is in flight and idle afterwards', async () => {
			const { state, checker } = createHarness();
			checker.holdCheck();

			const pending = state.checkNow();
			expect(state.status).toBe('checking');

			checker.releaseCheck();
			await pending;
			expect(state.status).toBe('idle');
		});

		it('should ask only once when a check is already in flight', async () => {
			const { state, checker } = createHarness();
			checker.holdCheck();

			const first = state.checkNow();
			const second = state.checkNow();
			checker.releaseCheck();
			await Promise.all([first, second]);

			expect(checker.checkCalls).toBe(1);
		});

		it('should do nothing on a platform that cannot update', async () => {
			const { state, checker } = createHarness({ isSupported: false });

			await state.checkNow();

			expect(checker.checkCalls).toBe(0);
			expect(state.isSupported).toBe(false);
			expect(state.upToDate).toBe(false);
		});
	});

	describe('start', () => {
		it('should check as soon as it starts', async () => {
			const { state, checker } = createHarness();

			state.start();
			await vi.waitFor(() => expect(checker.checkCalls).toBe(1));

			state.stop();
		});

		it('should check again every six hours while it stays open', async () => {
			vi.useFakeTimers();
			const { state, checker } = createHarness();

			state.start();
			await vi.advanceTimersByTimeAsync(0);
			expect(checker.checkCalls).toBe(1);

			await vi.advanceTimersByTimeAsync(UPDATE_CHECK_INTERVAL_MS - 1);
			expect(checker.checkCalls).toBe(1);

			await vi.advanceTimersByTimeAsync(1);
			expect(checker.checkCalls).toBe(2);

			await vi.advanceTimersByTimeAsync(UPDATE_CHECK_INTERVAL_MS);
			expect(checker.checkCalls).toBe(3);

			state.stop();
		});

		it('should not schedule a second loop when started twice', async () => {
			vi.useFakeTimers();
			const { state, checker } = createHarness();

			state.start();
			state.start();
			await vi.advanceTimersByTimeAsync(UPDATE_CHECK_INTERVAL_MS);

			expect(checker.checkCalls).toBe(2);

			state.stop();
		});

		it('should stop checking after stop', async () => {
			vi.useFakeTimers();
			const { state, checker } = createHarness();

			state.start();
			await vi.advanceTimersByTimeAsync(0);
			state.stop();
			await vi.advanceTimersByTimeAsync(UPDATE_CHECK_INTERVAL_MS * 2);

			expect(checker.checkCalls).toBe(1);
		});

		it('should neither check nor schedule on a platform that cannot update', async () => {
			vi.useFakeTimers();
			const { state, checker } = createHarness({ isSupported: false });

			state.start();
			await vi.advanceTimersByTimeAsync(UPDATE_CHECK_INTERVAL_MS * 2);

			expect(checker.checkCalls).toBe(0);
		});
	});

	describe('canInstall', () => {
		it('should be false while there is no update', () => {
			const { state } = createHarness();

			expect(state.canInstall).toBe(false);
		});

		it('should be true with an update and an idle timer', async () => {
			const { state, checker } = createHarness({ timerState: 'idle' });
			checker.nextCheck = UPDATE;

			await state.checkNow();

			expect(state.canInstall).toBe(true);
			expect(state.installBlockedByTimer).toBe(false);
		});

		it('should be true with an update and a completed timer', async () => {
			const { state, checker } = createHarness({ timerState: 'completed' });
			checker.nextCheck = UPDATE;

			await state.checkNow();

			expect(state.canInstall).toBe(true);
		});

		it.each(['running', 'paused'] as const)(
			'should be false with an update while the timer is %s',
			async (timerState) => {
				const { state, checker } = createHarness({ timerState });
				checker.nextCheck = UPDATE;

				await state.checkNow();

				expect(state.hasUpdate).toBe(true);
				expect(state.canInstall).toBe(false);
				expect(state.installBlockedByTimer).toBe(true);
			}
		);

		it('should follow the timer as it changes', async () => {
			const { state, checker, timer } = createHarness({ timerState: 'running' });
			checker.nextCheck = UPDATE;
			await state.checkNow();

			timer.state = 'idle';

			expect(state.canInstall).toBe(true);
		});
	});

	describe('install', () => {
		it('should install the update found when the timer allows it', async () => {
			const { state, checker } = createHarness();
			checker.nextCheck = UPDATE;
			await state.checkNow();

			await state.install();

			expect(checker.installCalls).toBe(1);
			expect(state.installFailed).toBe(false);
			expect(state.status).toBe('idle');
		});

		it.each(['running', 'paused'] as const)(
			'should refuse to install while the timer is %s',
			async (timerState) => {
				const { state, checker } = createHarness({ timerState });
				checker.nextCheck = UPDATE;
				await state.checkNow();

				await state.install();

				expect(checker.installCalls).toBe(0);
			}
		);

		it('should not install when there is no update', async () => {
			const { state, checker } = createHarness();

			await state.install();

			expect(checker.installCalls).toBe(0);
		});

		it('should refuse a second install while one is in flight', async () => {
			const { state, checker } = createHarness();
			checker.nextCheck = UPDATE;
			await state.checkNow();

			const first = state.install();
			expect(state.status).toBe('installing');
			expect(state.canInstall).toBe(false);
			const second = state.install();
			await Promise.all([first, second]);

			expect(checker.installCalls).toBe(1);
		});

		it('should record a failed install, keep the update and allow a retry', async () => {
			const { state, checker } = createHarness();
			checker.nextCheck = UPDATE;
			await state.checkNow();
			checker.nextInstall = new Error('signature mismatch');

			await expect(state.install()).resolves.toBeUndefined();

			expect(state.installFailed).toBe(true);
			expect(state.info).toEqual(UPDATE);
			expect(state.status).toBe('idle');
			expect(state.canInstall).toBe(true);

			checker.nextInstall = null;
			await state.install();

			expect(state.installFailed).toBe(false);
			expect(checker.installCalls).toBe(2);
		});
	});
});
