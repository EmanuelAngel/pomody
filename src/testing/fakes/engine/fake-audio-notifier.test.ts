import { describe, it, expect } from 'vitest';
import { FakeAudioNotifier } from '$tests/fakes/engine/fake-audio-notifier';
import type { IAudioNotifier } from '$lib/domain/ports/IAudioNotifier';
import type { TimerMode } from '$lib/domain/timer/timer-fsm';

describe('FakeAudioNotifier', () => {
	it('initializes with empty calls and zero unlock count', () => {
		const notifier = new FakeAudioNotifier();

		expect(notifier.notifyBlockCompletedCalls).toEqual([]);
		expect(notifier.unlockCallCount).toBe(0);
	});

	it('records completed timer modes in notifyBlockCompletedCalls', () => {
		const notifier = new FakeAudioNotifier();

		notifier.notifyBlockCompleted('focus');
		notifier.notifyBlockCompleted('shortBreak');
		notifier.notifyBlockCompleted('longBreak');

		expect(notifier.notifyBlockCompletedCalls).toEqual(['focus', 'shortBreak', 'longBreak']);
	});

	it('supports awaiting notifyBlockCompleted for async callers', async () => {
		const notifier = new FakeAudioNotifier();

		await notifier.notifyBlockCompleted('focus');

		expect(notifier.notifyBlockCompletedCalls).toEqual(['focus']);
	});

	it('increments unlockCallCount on unlock()', () => {
		const notifier = new FakeAudioNotifier();

		notifier.unlock();
		notifier.unlock();

		expect(notifier.unlockCallCount).toBe(2);
	});

	it('supports awaiting unlock for async callers', async () => {
		const notifier = new FakeAudioNotifier();

		await notifier.unlock();

		expect(notifier.unlockCallCount).toBe(1);
	});

	it('resets all recorded calls and counters on reset()', () => {
		const notifier = new FakeAudioNotifier();

		notifier.notifyBlockCompleted('focus');
		notifier.unlock();

		expect(notifier.notifyBlockCompletedCalls).toHaveLength(1);
		expect(notifier.unlockCallCount).toBe(1);

		notifier.reset();

		expect(notifier.notifyBlockCompletedCalls).toEqual([]);
		expect(notifier.unlockCallCount).toBe(0);
	});

	it('conforms strictly to IAudioNotifier interface', () => {
		const notifier: IAudioNotifier = new FakeAudioNotifier();
		notifier.unlock();
		const mode: TimerMode = 'focus';
		notifier.notifyBlockCompleted(mode);
		expect(notifier).toBeDefined();
	});
});
