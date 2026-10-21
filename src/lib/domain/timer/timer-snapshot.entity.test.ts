import { describe, it, expect } from 'vitest';
import {
	buildTimerSnapshotRecord,
	resolveTimerRestore,
	sanitizeTimerSnapshot,
	type ActivePlanView,
	type TimerSnapshotRecord
} from './timer-snapshot.entity';

const NOW = 1_700_000_000_000;

function makeSnapshot(overrides: Partial<TimerSnapshotRecord> = {}): TimerSnapshotRecord {
	return {
		planId: 'plan-1',
		blockIndex: 0,
		state: 'paused',
		mode: 'focus',
		durationMs: 1_500_000,
		currentRound: 1,
		totalRoundsCompleted: 0,
		remainingMs: 900_000,
		savedAt: NOW,
		...overrides
	} as TimerSnapshotRecord;
}

function makePlan(
	activeBlockIndex: number,
	statuses: readonly ('pending' | 'in_progress' | 'completed' | 'skipped')[] = []
): ActivePlanView {
	const blocks = [
		{ index: 0, mode: 'focus' as const, durationSeconds: 1500, status: statuses[0] ?? 'pending' },
		{
			index: 1,
			mode: 'shortBreak' as const,
			durationSeconds: 300,
			status: statuses[1] ?? 'pending'
		},
		{ index: 2, mode: 'focus' as const, durationSeconds: 1500, status: statuses[2] ?? 'pending' },
		{
			index: 3,
			mode: 'longBreak' as const,
			durationSeconds: 900,
			status: statuses[3] ?? 'pending'
		},
		{ index: 4, mode: 'focus' as const, durationSeconds: 1500, status: statuses[4] ?? 'pending' }
	];

	return { id: 'plan-1', activeBlockIndex, blocks };
}

describe('sanitizeTimerSnapshot', () => {
	it('accepts a running record with an absolute anchor', () => {
		const record = makeSnapshot({
			state: 'running',
			remainingMs: undefined,
			endsAt: NOW + 60_000
		});

		expect(sanitizeTimerSnapshot(record)).toEqual(record);
	});

	it('accepts a bound free-running record with null binding', () => {
		const record = makeSnapshot({ planId: null, blockIndex: null });

		expect(sanitizeTimerSnapshot(record)).toEqual(record);
	});

	it('accepts idle at full duration and completed at zero', () => {
		expect(
			sanitizeTimerSnapshot(makeSnapshot({ state: 'idle', remainingMs: 1_500_000 }))
		).not.toBeNull();
		expect(
			sanitizeTimerSnapshot(makeSnapshot({ state: 'completed', remainingMs: 0 }))
		).not.toBeNull();
	});

	it.each([
		['a null record', null],
		['a non-object record', 'timer'],
		['a missing state', { ...makeSnapshot(), state: undefined }],
		['an unknown state', { ...makeSnapshot(), state: 'stopped' }],
		['an unknown mode', { ...makeSnapshot(), mode: 'nap' }],
		['planId without blockIndex', { ...makeSnapshot(), blockIndex: null }],
		['blockIndex without planId', { ...makeSnapshot(), planId: null }],
		['an empty planId', { ...makeSnapshot(), planId: '   ' }],
		['a fractional duration', { ...makeSnapshot(), durationMs: 1500.5 }],
		['a zero duration', { ...makeSnapshot(), durationMs: 0 }],
		['a running record without endsAt', { ...makeSnapshot({ state: 'running' }) }],
		[
			'a running record with infinite endsAt',
			{ ...makeSnapshot({ state: 'running', endsAt: Infinity }) }
		],
		['a paused record without remainingMs', { ...makeSnapshot({ remainingMs: undefined }) }],
		['a remaining time above duration', { ...makeSnapshot({ remainingMs: 2_000_000 }) }],
		['a negative remaining time', { ...makeSnapshot({ remainingMs: -1 }) }],
		['an idle record with partial remaining', { ...makeSnapshot({ state: 'idle' }) }],
		[
			'a completed record with remaining time',
			{ ...makeSnapshot({ state: 'completed', remainingMs: 1000 }) }
		],
		['a zero round', { ...makeSnapshot(), currentRound: 0 }],
		['negative completed rounds', { ...makeSnapshot(), totalRoundsCompleted: -2 }],
		['a missing savedAt', { ...makeSnapshot(), savedAt: undefined }]
	])('rejects %s', (_label, raw) => {
		expect(sanitizeTimerSnapshot(raw)).toBeNull();
	});

	it('returns a frozen record', () => {
		const record = sanitizeTimerSnapshot(makeSnapshot());

		expect(record).not.toBeNull();
		expect(Object.isFrozen(record)).toBe(true);
	});
});

describe('resolveTimerRestore', () => {
	it('resumes a running block with the wall-clock remaining', () => {
		const decision = resolveTimerRestore({
			persisted: makeSnapshot({
				state: 'running',
				remainingMs: undefined,
				endsAt: NOW + 120_000
			}),
			plan: makePlan(0),
			now: NOW
		});

		expect(decision).toMatchObject({
			kind: 'adopt',
			state: 'running',
			remainingMs: 120_000,
			planId: 'plan-1',
			blockIndex: 0
		});
	});

	it('discards a block that expired while the app was closed and anchors to the active block', () => {
		const decision = resolveTimerRestore({
			persisted: makeSnapshot({
				state: 'running',
				remainingMs: undefined,
				endsAt: NOW - 1
			}),
			plan: makePlan(0),
			now: NOW
		});

		expect(decision).toMatchObject({
			kind: 'anchor',
			reason: 'expired',
			blockIndex: 0,
			mode: 'focus',
			durationMs: 1_500_000
		});
	});

	it('discards a snapshot when the clock moved backwards', () => {
		const decision = resolveTimerRestore({
			persisted: makeSnapshot({
				state: 'running',
				remainingMs: undefined,
				endsAt: NOW + 2_000_000
			}),
			plan: makePlan(0),
			now: NOW
		});

		expect(decision).toMatchObject({ kind: 'anchor', reason: 'clock-skew' });
	});

	it('keeps a paused block exactly as it was', () => {
		const decision = resolveTimerRestore({
			persisted: makeSnapshot({ state: 'paused', remainingMs: 900_000 }),
			plan: makePlan(0),
			now: NOW
		});

		expect(decision).toMatchObject({ kind: 'adopt', state: 'paused', remainingMs: 900_000 });
	});

	it('restores a completed block against the previous plan block', () => {
		const decision = resolveTimerRestore({
			persisted: makeSnapshot({
				state: 'completed',
				blockIndex: 0,
				remainingMs: 0,
				durationMs: 1_500_000
			}),
			plan: makePlan(1),
			now: NOW
		});

		expect(decision).toMatchObject({ kind: 'adopt', state: 'completed', blockIndex: 0 });
	});

	it('anchors when a completed block has no previous plan block', () => {
		const decision = resolveTimerRestore({
			persisted: makeSnapshot({ state: 'completed', blockIndex: 0, remainingMs: 0 }),
			plan: makePlan(0),
			now: NOW
		});

		expect(decision).toMatchObject({ kind: 'anchor', reason: 'plan-mismatch' });
	});

	it('anchors when the block mode no longer matches the plan', () => {
		const decision = resolveTimerRestore({
			persisted: makeSnapshot({ mode: 'shortBreak', durationMs: 300_000, remainingMs: 300_000 }),
			plan: makePlan(0),
			now: NOW
		});

		expect(decision).toMatchObject({ kind: 'anchor', reason: 'plan-mismatch' });
	});

	it('anchors when the block duration no longer matches the frozen plan', () => {
		const decision = resolveTimerRestore({
			persisted: makeSnapshot({ durationMs: 600_000, remainingMs: 600_000 }),
			plan: makePlan(0),
			now: NOW
		});

		expect(decision).toMatchObject({ kind: 'anchor', reason: 'plan-mismatch' });
	});

	it('anchors when the block index does not match the active block', () => {
		const decision = resolveTimerRestore({
			persisted: makeSnapshot({ blockIndex: 2, durationMs: 1_500_000 }),
			plan: makePlan(0),
			now: NOW
		});

		expect(decision).toMatchObject({ kind: 'anchor', reason: 'plan-mismatch' });
	});

	it('anchors when the stored plan id belongs to a different plan', () => {
		const decision = resolveTimerRestore({
			persisted: makeSnapshot({ planId: 'plan-old' }),
			plan: makePlan(0),
			now: NOW
		});

		expect(decision).toMatchObject({ kind: 'anchor', reason: 'plan-mismatch' });
	});

	it('starts fresh when the bound plan is gone', () => {
		const decision = resolveTimerRestore({
			persisted: makeSnapshot(),
			plan: null,
			now: NOW
		});

		expect(decision).toEqual({ kind: 'fresh', reason: 'orphan-plan' });
	});

	it('anchors to the active block when no snapshot exists', () => {
		const decision = resolveTimerRestore({
			persisted: null,
			plan: makePlan(2, ['completed', 'completed', 'in_progress']),
			now: NOW
		});

		expect(decision).toMatchObject({
			kind: 'anchor',
			reason: 'missing-snapshot',
			blockIndex: 2,
			mode: 'focus',
			durationMs: 1_500_000,
			currentRound: 2,
			totalRoundsCompleted: 1
		});
	});

	it('starts fresh with neither snapshot nor plan', () => {
		expect(resolveTimerRestore({ persisted: null, plan: null, now: NOW })).toEqual({
			kind: 'fresh'
		});
	});

	it('anchors an unbound free-running snapshot when a plan is active', () => {
		const decision = resolveTimerRestore({
			persisted: makeSnapshot({ planId: null, blockIndex: null }),
			plan: makePlan(0),
			now: NOW
		});

		expect(decision).toMatchObject({ kind: 'anchor', reason: 'unbound-with-active-plan' });
	});

	it('restores a free-running block without a plan', () => {
		const decision = resolveTimerRestore({
			persisted: makeSnapshot({ planId: null, blockIndex: null }),
			plan: null,
			now: NOW
		});

		expect(decision).toMatchObject({ kind: 'adopt', planId: null, blockIndex: null });
	});

	it('discards an expired free-running block', () => {
		const decision = resolveTimerRestore({
			persisted: makeSnapshot({
				planId: null,
				blockIndex: null,
				state: 'running',
				remainingMs: undefined,
				endsAt: NOW - 5
			}),
			plan: null,
			now: NOW
		});

		expect(decision).toEqual({ kind: 'fresh', reason: 'expired' });
	});

	it('derives the round of a break from the focus block it follows', () => {
		const decision = resolveTimerRestore({
			persisted: null,
			plan: makePlan(1, ['completed', 'in_progress']),
			now: NOW
		});

		expect(decision).toMatchObject({ currentRound: 1, totalRoundsCompleted: 1 });
	});
});

describe('buildTimerSnapshotRecord', () => {
	const base = {
		state: 'running' as const,
		mode: 'focus' as const,
		durationMs: 1_500_000,
		remainingMs: 600_000,
		currentRound: 1,
		totalRoundsCompleted: 0,
		planId: 'plan-1',
		activeBlockIndex: 0,
		now: NOW
	};

	it('anchors a running record with endsAt and no remainingMs', () => {
		const record = buildTimerSnapshotRecord(base);

		expect(record.endsAt).toBe(NOW + 600_000);
		expect(record.remainingMs).toBeUndefined();
		expect(record.blockIndex).toBe(0);
	});

	it('maps a completed block to the index before the active one', () => {
		const record = buildTimerSnapshotRecord({
			...base,
			state: 'completed',
			remainingMs: 0,
			activeBlockIndex: 2
		});

		expect(record.blockIndex).toBe(1);
		expect(record.remainingMs).toBe(0);
	});

	it('keeps a paused record frozen at its remaining time', () => {
		const record = buildTimerSnapshotRecord({ ...base, state: 'paused' });

		expect(record.remainingMs).toBe(600_000);
		expect(record.endsAt).toBeUndefined();
	});

	it('clears the binding for a free-running block', () => {
		const record = buildTimerSnapshotRecord({ ...base, planId: null, activeBlockIndex: null });

		expect(record.planId).toBeNull();
		expect(record.blockIndex).toBeNull();
	});

	it('produces a record the sanitizer accepts', () => {
		expect(sanitizeTimerSnapshot(buildTimerSnapshotRecord(base))).not.toBeNull();
	});
});
