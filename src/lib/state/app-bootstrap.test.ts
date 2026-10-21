import { describe, it, expect, beforeEach, vi } from 'vitest';
import { FakeSessionPlanRepository } from '$tests/fakes/repositories/fake-session-plan-repository';
import { FakeTimerStateRepository } from '$tests/fakes/repositories/fake-timer-state-repository';
import { FakeTaskRepository } from '$tests/fakes/repositories/fake-task-repository';
import { FakeTicker } from '$tests/fakes/engine/fake-ticker';
import { FakeAudioNotifier } from '$tests/fakes/engine/fake-audio-notifier';
import {
	assignTaskToBlock,
	calculateSessionBudgetByBlocks,
	updateBlockStatus
} from '$lib/domain/planning/session-plan.entity';
import { buildTimerSnapshotRecord } from '$lib/domain/timer/timer-snapshot.entity';
import { AppBootstrap, toActivePlanView } from './app-bootstrap.svelte';
import { PlanningState } from './planning.svelte';
import { CadencePresetsState } from './cadence-presets.svelte';
import { TimerState } from './timer.svelte';
import { TasksState } from './tasks.svelte';
import type { SessionPlan } from '$lib/domain/planning/session-plan.entity';
import { FakeCadencePresetRepository } from '$tests/fakes/repositories/fake-cadence-preset-repository';
import { cadencePresetId, type CadencePreset } from '$lib/domain/planning/cadence-preset.entity';

const DEEP_WORK_PRESET: CadencePreset = {
	id: cadencePresetId({
		focusMinutes: 45,
		shortBreakMinutes: 15,
		longBreakMinutes: 30,
		longBreakInterval: 3
	}),
	name: 'Deep work',
	focusMinutes: 45,
	shortBreakMinutes: 15,
	longBreakMinutes: 30,
	longBreakInterval: 3
};

const NOW = 1_700_000_000_000;
const CONFIG = {
	focusDurationSeconds: 1500,
	shortBreakDurationSeconds: 300,
	longBreakDurationSeconds: 900,
	roundsBeforeLongBreak: 4
};

function makePlan(): SessionPlan {
	return calculateSessionBudgetByBlocks({
		blockCount: 2,
		sessionConfig: CONFIG,
		id: 'plan-1',
		createdAt: 1000
	});
}

describe('AppBootstrap', () => {
	let planRepo: FakeSessionPlanRepository;
	let timerRepo: FakeTimerStateRepository;
	let ticker: FakeTicker;
	let timer: TimerState;
	let tasks: TasksState;
	let planning: PlanningState;
	let cadencePresets: CadencePresetsState;
	let cadencePresetRepo: FakeCadencePresetRepository;

	beforeEach(() => {
		planRepo = new FakeSessionPlanRepository();
		timerRepo = new FakeTimerStateRepository();
		ticker = new FakeTicker();
		timer = new TimerState(
			undefined,
			ticker,
			new FakeAudioNotifier(),
			undefined,
			timerRepo,
			() => NOW
		);
		tasks = new TasksState(new FakeTaskRepository());
		planning = new PlanningState(planRepo, timer, tasks);
		cadencePresetRepo = new FakeCadencePresetRepository();
		cadencePresets = new CadencePresetsState(cadencePresetRepo);
	});

	function createBootstrap() {
		return new AppBootstrap({
			planning,
			timer,
			tasks,
			timerRepository: timerRepo,
			now: () => NOW,
			cadencePresets
		});
	}

	it('restores a running block and the active task', async () => {
		const task = await tasks.createTask('Write the spec');
		let plan = makePlan();
		plan = assignTaskToBlock(plan, 0, task.id);
		plan = updateBlockStatus(plan, 0, 'in_progress');
		await planRepo.saveActivePlan(plan);

		await timerRepo.save(
			buildTimerSnapshotRecord({
				state: 'running',
				mode: 'focus',
				durationMs: 1_500_000,
				remainingMs: 120_000,
				currentRound: 1,
				totalRoundsCompleted: 0,
				planId: plan.id,
				blockIndex: 0,
				now: NOW
			})
		);

		const bootstrap = createBootstrap();
		await bootstrap.restore();

		expect(bootstrap.isReady).toBe(true);
		expect(timer.state).toBe('running');
		expect(timer.remainingMs).toBe(120_000);
		expect(ticker.isRunning).toBe(true);
		expect(tasks.activeTaskId).toBe(task.id);
	});

	it('discards an expired block and anchors to the active one', async () => {
		const plan = updateBlockStatus(makePlan(), 0, 'in_progress');
		await planRepo.saveActivePlan(plan);
		await timerRepo.save(
			buildTimerSnapshotRecord({
				state: 'running',
				mode: 'focus',
				durationMs: 1_500_000,
				remainingMs: 60_000,
				currentRound: 1,
				totalRoundsCompleted: 0,
				planId: plan.id,
				blockIndex: 0,
				now: NOW - 300_000
			})
		);

		const bootstrap = createBootstrap();
		await bootstrap.restore();

		expect(timer.state).toBe('idle');
		expect(timer.remainingMs).toBe(1_500_000);
		expect(planning.activePlan?.blocks[0].status).toBe('in_progress');
		expect(timerRepo.peek()).toMatchObject({ state: 'idle', blockIndex: 0 });
	});

	it('clears an orphan snapshot when the plan is gone', async () => {
		await timerRepo.save(
			buildTimerSnapshotRecord({
				state: 'running',
				mode: 'focus',
				durationMs: 1_500_000,
				remainingMs: 120_000,
				currentRound: 1,
				totalRoundsCompleted: 0,
				planId: 'plan-gone',
				blockIndex: 0,
				now: NOW
			})
		);

		const bootstrap = createBootstrap();
		await bootstrap.restore();

		expect(timer.state).toBe('idle');
		expect(timerRepo.peek()).toMatchObject({ planId: null, state: 'idle' });
	});

	it('anchors to the active block when there is no snapshot', async () => {
		const plan = updateBlockStatus(makePlan(), 2, 'in_progress');
		await planRepo.saveActivePlan(plan);

		const bootstrap = createBootstrap();
		await bootstrap.restore();

		expect(timer.state).toBe('idle');
		expect(timer.mode).toBe('focus');
		expect(timer.remainingMs).toBe(1_500_000);
		expect(timerRepo.peek()).toMatchObject({ planId: plan.id, blockIndex: 2 });
	});

	it('leaves the active task untouched during a break', async () => {
		const plan = updateBlockStatus(makePlan(), 1, 'in_progress');
		await planRepo.saveActivePlan(plan);

		const setActiveTask = vi.spyOn(tasks, 'setActiveTask');
		const bootstrap = createBootstrap();
		await bootstrap.restore();

		expect(setActiveTask).not.toHaveBeenCalled();
	});

	it('starts from defaults when the restore throws', async () => {
		const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
		vi.spyOn(timerRepo, 'load').mockRejectedValue(new Error('storage exploded'));

		const bootstrap = createBootstrap();
		await bootstrap.restore();

		expect(bootstrap.isReady).toBe(true);
		expect(timer.state).toBe('idle');
		expect(errorSpy).toHaveBeenCalled();
	});

	it('restores only once', async () => {
		const bootstrap = createBootstrap();

		await bootstrap.restore();
		await bootstrap.restore();

		expect(planRepo.getActivePlanCallCount).toBe(1);
	});

	it('hydrates the saved cadence presets before the shell renders', async () => {
		cadencePresetRepo = new FakeCadencePresetRepository([DEEP_WORK_PRESET]);
		cadencePresets = new CadencePresetsState(cadencePresetRepo);

		const bootstrap = createBootstrap();
		await bootstrap.restore();

		expect(cadencePresets.isLoaded).toBe(true);
		expect(cadencePresets.presets).toEqual([DEEP_WORK_PRESET]);
		expect(cadencePresetRepo.loadCallCount).toBe(1);
	});
});

describe('toActivePlanView', () => {
	it('projects the plan blocks and the completed flag', () => {
		const plan = makePlan();
		const view = toActivePlanView(plan, 1);

		expect(view.id).toBe(plan.id);
		expect(view.activeBlockIndex).toBe(1);
		expect(view.completed).toBe(false);
		expect(view.blocks).toHaveLength(plan.blocks.length);
		expect(view.blocks[1]).toEqual({
			index: 1,
			mode: 'shortBreak',
			durationSeconds: 300,
			status: 'pending'
		});
	});

	it('marks a fully completed plan', () => {
		const plan = makePlan();
		let completed = updateBlockStatus(plan, 0, 'completed');
		completed = updateBlockStatus(completed, 1, 'skipped');
		completed = updateBlockStatus(completed, 2, 'completed');

		expect(toActivePlanView(completed, 0).completed).toBe(true);
	});
});
