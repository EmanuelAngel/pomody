import { describe, it, expect, beforeEach } from 'vitest';
import { FakeSessionPlanRepository } from '$tests/fakes/repositories/fake-session-plan-repository';
import { FakeTicker } from '$tests/fakes/engine/fake-ticker';
import { FakeAudioNotifier } from '$tests/fakes/engine/fake-audio-notifier';
import { FakeTaskRepository } from '$tests/fakes/repositories/fake-task-repository';
import { createPlanningState, type PlanningState } from './planning.svelte';
import { TimerState } from './timer.svelte';
import type { TimerConfig } from '../domain/timer/timer-fsm';
import { TasksState } from './tasks.svelte';
import type { SessionPlan } from '../domain/planning/session-plan.entity';

/**
 * Shared-code contract for the four cadence setters.
 *
 * These setters are consumed by the planning steppers, not only by the preset chips, so their
 * observable behavior is a contract: ranges, rounding, non-finite guards, the draft write path
 * and the forward-only path with an active session. The setter bodies were refactored to delegate
 * to `PlanningState.applyCadence`; this file pins the behavior that refactor had to preserve, and
 * is the regression guard for any future change to that path.
 */

const flush = (): Promise<void> => new Promise((resolve) => setTimeout(resolve, 0));

type SetterName =
	'setFocusMinutes' | 'setShortBreakMinutes' | 'setLongBreakMinutes' | 'setLongBreakInterval';

type GetterName = 'focusMinutes' | 'shortBreakMinutes' | 'longBreakMinutes' | 'longBreakInterval';

interface Harness {
	repo: FakeSessionPlanRepository;
	timer: TimerState;
	state: PlanningState;
}

function createHarness(): Harness {
	const repo = new FakeSessionPlanRepository();
	const ticker = new FakeTicker();
	const timer = new TimerState(undefined, ticker, new FakeAudioNotifier());
	const tasks = new TasksState(new FakeTaskRepository());
	const state = createPlanningState(repo, timer, tasks);

	return { repo, timer, state };
}

function readConfig(timer: TimerState): TimerConfig {
	return {
		focusDurationSeconds: timer.config.focusDurationSeconds,
		shortBreakDurationSeconds: timer.config.shortBreakDurationSeconds,
		longBreakDurationSeconds: timer.config.longBreakDurationSeconds,
		roundsBeforeLongBreak: timer.config.roundsBeforeLongBreak
	};
}

function readCadence(state: PlanningState): [number, number, number, number] {
	return [
		state.focusMinutes,
		state.shortBreakMinutes,
		state.longBreakMinutes,
		state.longBreakInterval
	];
}

/** `[index, mode, durationSeconds, status]` per block, so two plans compare as plain data. */
function readBlocks(plan: SessionPlan | null): Array<(string | number)[]> {
	return (plan?.blocks ?? []).map((block) => [
		block.index,
		block.mode,
		block.durationSeconds,
		block.status
	]);
}

describe('planning cadence setters (shared-code contract)', () => {
	let harness: Harness;

	beforeEach(() => {
		harness = createHarness();
	});

	it('clamps and rounds each field to its own range', () => {
		const cases: Array<{
			setter: SetterName;
			getter: GetterName;
			input: number;
			expected: number;
		}> = [
			{ setter: 'setFocusMinutes', getter: 'focusMinutes', input: 0, expected: 1 },
			{ setter: 'setFocusMinutes', getter: 'focusMinutes', input: 999, expected: 120 },
			{ setter: 'setFocusMinutes', getter: 'focusMinutes', input: 45.6, expected: 46 },
			{ setter: 'setShortBreakMinutes', getter: 'shortBreakMinutes', input: -5, expected: 1 },
			{ setter: 'setShortBreakMinutes', getter: 'shortBreakMinutes', input: 100, expected: 60 },
			{ setter: 'setShortBreakMinutes', getter: 'shortBreakMinutes', input: 4.4, expected: 4 },
			{ setter: 'setLongBreakMinutes', getter: 'longBreakMinutes', input: 0, expected: 1 },
			{ setter: 'setLongBreakMinutes', getter: 'longBreakMinutes', input: 200, expected: 90 },
			{ setter: 'setLongBreakMinutes', getter: 'longBreakMinutes', input: 14.5, expected: 15 },
			{ setter: 'setLongBreakInterval', getter: 'longBreakInterval', input: 0, expected: 1 },
			{ setter: 'setLongBreakInterval', getter: 'longBreakInterval', input: 50, expected: 12 },
			{ setter: 'setLongBreakInterval', getter: 'longBreakInterval', input: 3.5, expected: 4 }
		];

		for (const { setter, getter, input, expected } of cases) {
			harness.state[setter](input);
			expect(harness.state[getter]).toBe(expected);
		}
	});

	it('ignores non-finite input without touching state or timer', () => {
		harness.state.setFocusMinutes(45);
		harness.state.setShortBreakMinutes(10);
		harness.state.setLongBreakMinutes(30);
		harness.state.setLongBreakInterval(3);
		const before = { cadence: readCadence(harness.state), config: readConfig(harness.timer) };

		harness.state.setFocusMinutes(Number.NaN);
		harness.state.setFocusMinutes(Number.POSITIVE_INFINITY);
		harness.state.setShortBreakMinutes(Number.NEGATIVE_INFINITY);
		harness.state.setLongBreakMinutes(Number.NaN);
		harness.state.setLongBreakInterval(Number.NaN);

		expect({ cadence: readCadence(harness.state), config: readConfig(harness.timer) }).toEqual(
			before
		);
	});

	it('draft update writes state and timer.config and never the plan repository', () => {
		harness.state.setFocusMinutes(45);

		expect(readCadence(harness.state)).toEqual([45, 5, 15, 4]);
		expect(readConfig(harness.timer)).toEqual({
			focusDurationSeconds: 2700,
			shortBreakDurationSeconds: 300,
			longBreakDurationSeconds: 900,
			roundsBeforeLongBreak: 4
		});
		expect(harness.repo.saveActivePlanCallCount).toBe(0);
	});

	it('active session is forward-only, persists once per call, and keeps a chained change', async () => {
		await harness.state.startSession();
		harness.timer.skip();
		const before = readBlocks(harness.state.activePlan);
		const savesBefore = harness.repo.saveActivePlanCallCount;

		harness.state.setFocusMinutes(45);
		await flush();
		harness.state.setShortBreakMinutes(10);
		await flush();
		const after = readBlocks(harness.state.activePlan);

		// Past and running blocks keep their duration and status.
		expect(after[0]).toEqual(before[0]);
		expect(after[1]).toEqual(before[1]);
		// Upcoming focus and break blocks take the new values.
		expect([after[2][2], after[4][2], after[6][2]]).toEqual([2700, 2700, 2700]);
		expect([after[3][2], after[5][2]]).toEqual([600, 600]);
		expect(harness.repo.saveActivePlanCallCount - savesBefore).toBe(2);
	});

	it('active session clamping still recomputes the break rhythm', async () => {
		await harness.state.startSession();
		harness.timer.skip();

		harness.state.setFocusMinutes(0);
		await flush();
		harness.state.setLongBreakInterval(2);
		await flush();
		const after = readBlocks(harness.state.activePlan);

		expect(harness.state.focusMinutes).toBe(1);
		expect(after[2][2]).toBe(60);
		expect(after[3][0]).toBe(3);
		expect(after[3][1]).toBe('longBreak');
		expect(after[3][2]).toBe(900);
	});
});
