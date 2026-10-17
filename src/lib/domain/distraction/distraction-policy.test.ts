import { describe, it, expect } from 'vitest';
import type { WindowObservation } from '../ports/distraction-monitor.port';
import {
	DEFAULT_NOTIFY_POLICY,
	shouldNotify,
	type NoticeFired,
	type NotifyPolicy
} from './distraction-policy';

const NOW = 1_700_000_000_000;

function observation(overrides: Partial<WindowObservation> = {}): WindowObservation {
	return {
		exe: 'chrome.exe',
		title: 'YouTube - Google Chrome',
		idleSeconds: 0,
		...overrides
	};
}

function fired(ruleId: string, firedAt: number): NoticeFired {
	return { ruleId, firedAt };
}

function policy(overrides: Partial<NotifyPolicy> = {}): NotifyPolicy {
	return { ...DEFAULT_NOTIFY_POLICY, ...overrides };
}

describe('DEFAULT_NOTIFY_POLICY', () => {
	it('exposes the documented 5-minute interval and 300-second idle guard', () => {
		expect(DEFAULT_NOTIFY_POLICY.intervalMinutes).toBe(5);
		expect(DEFAULT_NOTIFY_POLICY.idleGuardSeconds).toBe(300);
	});
});

describe('shouldNotify', () => {
	it('notifies when no notice was fired for the rule yet', () => {
		expect(
			shouldNotify({
				ruleId: 'rule-1',
				observation: observation(),
				firedThisBlock: [],
				now: NOW
			})
		).toBe(true);
	});

	it('does not notify when the user has been idle above the guard threshold', () => {
		expect(
			shouldNotify({
				ruleId: 'rule-1',
				observation: observation({ idleSeconds: DEFAULT_NOTIFY_POLICY.idleGuardSeconds + 1 }),
				firedThisBlock: [],
				now: NOW
			})
		).toBe(false);
	});

	it('notifies when the idle time is below the guard threshold', () => {
		expect(
			shouldNotify({
				ruleId: 'rule-1',
				observation: observation({ idleSeconds: DEFAULT_NOTIFY_POLICY.idleGuardSeconds - 1 }),
				firedThisBlock: [],
				now: NOW
			})
		).toBe(true);
	});

	it('does not notify at exactly the idle guard threshold', () => {
		expect(
			shouldNotify({
				ruleId: 'rule-1',
				observation: observation({ idleSeconds: DEFAULT_NOTIFY_POLICY.idleGuardSeconds }),
				firedThisBlock: [],
				now: NOW
			})
		).toBe(false);
	});

	it('does not notify the same rule before the interval has elapsed', () => {
		const fourMinutesAgo = NOW - 4 * 60_000;

		expect(
			shouldNotify({
				ruleId: 'rule-1',
				observation: observation(),
				firedThisBlock: [fired('rule-1', fourMinutesAgo)],
				now: NOW
			})
		).toBe(false);
	});

	it('notifies the same rule exactly at the interval boundary', () => {
		const fiveMinutesAgo = NOW - DEFAULT_NOTIFY_POLICY.intervalMinutes * 60_000;

		expect(
			shouldNotify({
				ruleId: 'rule-1',
				observation: observation(),
				firedThisBlock: [fired('rule-1', fiveMinutesAgo)],
				now: NOW
			})
		).toBe(true);
	});

	it('notifies the same rule once the interval has elapsed', () => {
		const sixMinutesAgo = NOW - 6 * 60_000;

		expect(
			shouldNotify({
				ruleId: 'rule-1',
				observation: observation(),
				firedThisBlock: [fired('rule-1', sixMinutesAgo)],
				now: NOW
			})
		).toBe(true);
	});

	it('keeps rules independent from each other', () => {
		const oneMinuteAgo = NOW - 60_000;

		expect(
			shouldNotify({
				ruleId: 'rule-2',
				observation: observation(),
				firedThisBlock: [fired('rule-1', oneMinuteAgo)],
				now: NOW
			})
		).toBe(true);
	});

	it('uses the most recent notice of the rule to decide', () => {
		const tenMinutesAgo = NOW - 10 * 60_000;
		const oneMinuteAgo = NOW - 60_000;

		expect(
			shouldNotify({
				ruleId: 'rule-1',
				observation: observation(),
				firedThisBlock: [fired('rule-1', tenMinutesAgo), fired('rule-1', oneMinuteAgo)],
				now: NOW
			})
		).toBe(false);
	});

	it('honors a custom policy for interval and idle guard', () => {
		const custom = policy({ intervalMinutes: 1, idleGuardSeconds: 10 });

		expect(
			shouldNotify({
				ruleId: 'rule-1',
				observation: observation({ idleSeconds: 30 }),
				firedThisBlock: [],
				now: NOW,
				policy: custom
			})
		).toBe(false);

		expect(
			shouldNotify({
				ruleId: 'rule-1',
				observation: observation({ idleSeconds: 5 }),
				firedThisBlock: [fired('rule-1', NOW - 2 * 60_000)],
				now: NOW,
				policy: custom
			})
		).toBe(true);
	});
});
