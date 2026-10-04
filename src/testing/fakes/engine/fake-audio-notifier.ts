import type { IAudioNotifier } from '$lib/domain/ports/IAudioNotifier';
import type { TimerMode } from '$lib/domain/timer/timer-fsm';

/**
 * In-memory test fake implementing IAudioNotifier.
 * Records played audio notifications and unlock requests without using Web Audio API.
 */
export class FakeAudioNotifier implements IAudioNotifier {
	public notifyBlockCompletedCalls: TimerMode[] = [];
	public unlockCallCount = 0;

	/**
	 * Records the completed timer mode in notifyBlockCompletedCalls.
	 */
	notifyBlockCompleted(mode: TimerMode): void {
		this.notifyBlockCompletedCalls.push(mode);
	}

	/**
	 * Increments the unlock call counter.
	 */
	unlock(): void {
		this.unlockCallCount++;
	}

	/**
	 * Resets all recorded calls and counters.
	 */
	reset(): void {
		this.notifyBlockCompletedCalls = [];
		this.unlockCallCount = 0;
	}
}
