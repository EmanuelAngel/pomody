import { describe, it, expect, vi } from 'vitest';
import { ActivityLogState } from './activity-log.svelte';
import { LocalActivityLogRepository } from '../adapters/storage/local-activity-log-repository';
import { InMemoryStorage } from '../adapters/storage/in-memory-storage';
import { TimerFSM } from '../domain/timer/timer-fsm';

const NOW = new Date('2026-11-20T15:00:00.000Z');

function setup() {
	const fsm = new TimerFSM({ focusDurationSeconds: 60 });
	const state = new ActivityLogState({
		repository: new LocalActivityLogRepository(new InMemoryStorage(), () => NOW),
		timer: { onEvent: (fn) => fsm.onEvent(fn) },
		nowProvider: () => NOW
	});
	return { fsm, state };
}

describe('ActivityLogState', () => {
	it('reports a failed first read and stays not loaded', async () => {
		vi.spyOn(console, 'error').mockImplementation(() => {});
		const repository = new LocalActivityLogRepository(new InMemoryStorage(), () => NOW);
		vi.spyOn(repository, 'getAll').mockRejectedValueOnce(new Error('read failed'));
		const state = new ActivityLogState({
			repository,
			timer: { onEvent: () => () => {} },
			nowProvider: () => NOW
		});

		await state.whenIdle();

		expect(state.isLoaded).toBe(false);
		expect(state.loadFailed).toBe(true);
		state.destroy();
		vi.restoreAllMocks();
	});

	it('records every timer action, without merging repeats', async () => {
		const { fsm, state } = setup();

		fsm.start();
		fsm.pause();
		fsm.resume();
		fsm.pause();
		fsm.resume();
		fsm.tick(60_000);
		await state.whenIdle();

		expect(state.isLoaded).toBe(true);
		expect(state.entries.map((e) => e.kind)).toEqual([
			'block-started',
			'block-paused',
			'block-resumed',
			'block-paused',
			'block-resumed',
			'block-completed'
		]);
		expect(state.entries.every((e) => e.mode === 'focus')).toBe(true);
	});

	it('does not record the skip that leaves a completed block as a second action', async () => {
		const { fsm, state } = setup();

		fsm.start();
		fsm.tick(60_000);
		fsm.skip();
		await state.whenIdle();

		expect(state.entries.map((e) => e.kind)).toEqual(['block-started', 'block-completed']);
	});

	it('records a config change only when the configuration actually changes', async () => {
		const { fsm, state } = setup();

		fsm.updateConfig({ focusDurationSeconds: 60 });
		fsm.updateConfig({ focusDurationSeconds: 50 * 60 });
		await state.whenIdle();

		expect(state.entries).toHaveLength(1);
		expect(state.entries[0]).toMatchObject({ kind: 'config-changed', detail: '50/5/15 ×4' });
	});

	it('records actions reported by other states', async () => {
		const { state } = setup();

		state.record('daily-goal-changed', { detail: '120' });
		await state.whenIdle();

		expect(state.entries[0]).toMatchObject({ kind: 'daily-goal-changed', detail: '120' });
		state.destroy();
	});
});
