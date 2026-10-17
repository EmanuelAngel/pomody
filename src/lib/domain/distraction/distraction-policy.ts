import type { WindowObservation } from '../ports/distraction-monitor.port';

export interface NotifyPolicy {
	/** Minimum minutes between two notices of the same rule inside the block. */
	readonly intervalMinutes: number;
	/** If the user gave no input in these seconds, no notice is emitted. */
	readonly idleGuardSeconds: number;
}

export const DEFAULT_NOTIFY_POLICY: NotifyPolicy = Object.freeze({
	intervalMinutes: 5,
	idleGuardSeconds: 300
});

export interface NoticeFired {
	readonly ruleId: string;
	readonly firedAt: number;
}

export interface ShouldNotifyInput {
	readonly ruleId: string;
	readonly observation: WindowObservation;
	readonly firedThisBlock: readonly NoticeFired[];
	readonly now: number;
	readonly policy?: NotifyPolicy;
}

/**
 * Pure cadence decision for the block in progress (spec §3.4): it receives the block's
 * notice history, the current moment and the policy, and answers yes or no. It knows
 * nothing about Tauri, the DOM or storage, and never reads the clock itself.
 */
export function shouldNotify(input: ShouldNotifyInput): boolean {
	const policy = input.policy ?? DEFAULT_NOTIFY_POLICY;

	if (input.observation.idleSeconds >= policy.idleGuardSeconds) {
		return false;
	}

	let lastFiredAt: number | null = null;
	for (const notice of input.firedThisBlock) {
		if (notice.ruleId === input.ruleId && (lastFiredAt === null || notice.firedAt > lastFiredAt)) {
			lastFiredAt = notice.firedAt;
		}
	}

	if (lastFiredAt === null) {
		return true;
	}

	return input.now - lastFiredAt >= policy.intervalMinutes * 60_000;
}
