import { describe, it, expect, beforeEach } from 'vitest';
import { FakeSettingsStorage } from '$tests/fakes/repositories/fake-settings-storage';
import { InMemoryStorage } from '../adapters/storage/in-memory-storage';
import { LocalFocusHistoryRepository } from '../adapters/storage/local-focus-history-repository';
import { createDailyStatsState } from './daily-stats.svelte';
import { createFocusHistoryState } from './focus-history.svelte';
import { IllustrationState } from './illustration.svelte';
import { DEFAULT_ILLUSTRATION_SETTINGS } from '../domain/ports/settings-storage.port';
import type { BlockCompletedEvent, DomainEvent } from '../domain/events/block-completed.event';
import type { TimerMode } from '../domain/timer/timer-fsm';

class FakeTimerSnapshot {
	public isRunning = false;
	public mode: TimerMode = 'focus';

	startFocus(): void {
		this.isRunning = true;
		this.mode = 'focus';
	}

	startBreak(mode: TimerMode = 'shortBreak'): void {
		this.isRunning = true;
		this.mode = mode;
	}

	pause(): void {
		this.isRunning = false;
	}
}

class MockTimerEmitter {
	public subscribers = new Set<(event: DomainEvent) => void>();

	onEvent(fn: (event: DomainEvent) => void): () => void {
		this.subscribers.add(fn);
		return () => this.subscribers.delete(fn);
	}

	emit(event: DomainEvent): void {
		for (const sub of Array.from(this.subscribers)) {
			sub(event);
		}
	}
}

function focusCompleted(durationMinutes: number): BlockCompletedEvent {
	return {
		type: 'block-completed',
		mode: 'focus',
		round: 1,
		totalRoundsCompleted: 1,
		durationMs: durationMinutes * 60_000,
		elapsedMs: durationMinutes * 60_000,
		completedAt: new Date()
	};
}

function buildIllustration(
	options: {
		minutes?: number;
		settings?: Partial<typeof DEFAULT_ILLUSTRATION_SETTINGS>;
	} = {}
) {
	const storage = new FakeSettingsStorage({
		illustration: { ...DEFAULT_ILLUSTRATION_SETTINGS, ...options.settings }
	});
	const timer = new FakeTimerSnapshot();
	const dailyStats = { accumulatedMinutes: options.minutes ?? 0 };
	const state = new IllustrationState(storage, dailyStats, timer);

	return { state, storage, timer, dailyStats };
}

describe('IllustrationState', () => {
	describe('settings defaults', () => {
		it('is disabled, animated, visible while focusing and forest-first by default', () => {
			const state = new IllustrationState(
				undefined,
				{ accumulatedMinutes: 0 },
				new FakeTimerSnapshot()
			);

			expect(state.enabled).toBe(false);
			expect(state.motionEnabled).toBe(true);
			expect(state.hideWhileFocusing).toBe(false);
			expect(state.selectedId).toBe('forest');
		});

		it('hydrates from persisted settings', () => {
			const { state } = buildIllustration({
				settings: {
					enabled: true,
					motionEnabled: false,
					hideWhileFocusing: true,
					selectedId: 'desert'
				}
			});

			expect(state.enabled).toBe(true);
			expect(state.motionEnabled).toBe(false);
			expect(state.hideWhileFocusing).toBe(true);
			expect(state.selectedId).toBe('desert');
		});
	});

	describe('progression derivation', () => {
		it('derives step and phase from accumulated minutes', () => {
			const { state } = buildIllustration({ minutes: 75 });

			expect(state.step).toBe(3);
			expect(state.phase).toBe(1);
			expect(state.definition.phaseCount).toBe(5);
		});

		it('caps the forest at its last phase', () => {
			const { state } = buildIllustration({ minutes: 400 });

			expect(state.step).toBe(15);
			expect(state.phase).toBe(4);
		});

		it('uses the selected illustration phase count', () => {
			const { state } = buildIllustration({
				minutes: 75,
				settings: { selectedId: 'desert' }
			});

			expect(state.phase).toBe(0);

			const late = buildIllustration({ minutes: 250, settings: { selectedId: 'desert' } });
			expect(late.state.phase).toBe(2);
		});
	});

	describe('visibility and motion', () => {
		it('detects whether a focus block is running', () => {
			const { state, timer } = buildIllustration({ settings: { enabled: true } });

			expect(state.isFocusRunning).toBe(false);

			timer.startFocus();
			expect(state.isFocusRunning).toBe(true);

			timer.startBreak();
			expect(state.isFocusRunning).toBe(false);
		});

		it('hides while focusing only when the preference is enabled', () => {
			const { state, timer } = buildIllustration({
				settings: { enabled: true, hideWhileFocusing: true }
			});
			timer.startFocus();

			expect(state.isVisible).toBe(false);

			timer.pause();
			expect(state.isVisible).toBe(true);

			timer.startBreak();
			expect(state.isVisible).toBe(true);
		});

		it('animates only while visible, motion-enabled and focusing', () => {
			const { state, timer } = buildIllustration({ settings: { enabled: true } });

			expect(state.shouldAnimate).toBe(false);

			timer.startFocus();
			expect(state.shouldAnimate).toBe(true);

			timer.pause();
			expect(state.shouldAnimate).toBe(false);

			timer.startBreak();
			expect(state.shouldAnimate).toBe(false);
		});

		it('never animates when disabled or static', () => {
			const disabled = buildIllustration({ settings: { enabled: false } });
			disabled.timer.startFocus();
			expect(disabled.state.shouldAnimate).toBe(false);

			const staticScene = buildIllustration({
				settings: { enabled: true, motionEnabled: false }
			});
			staticScene.timer.startFocus();
			expect(staticScene.state.shouldAnimate).toBe(false);
			expect(staticScene.state.isVisible).toBe(true);
		});
	});

	describe('settings mutations', () => {
		let storage: FakeSettingsStorage;

		beforeEach(() => {
			storage = new FakeSettingsStorage();
		});

		it('persists the master switch', () => {
			const state = new IllustrationState(
				storage,
				{ accumulatedMinutes: 0 },
				new FakeTimerSnapshot()
			);

			state.setEnabled(true);

			expect(state.enabled).toBe(true);
			expect(storage.saveSettingsCalls.at(-1)).toEqual({
				illustration: { ...DEFAULT_ILLUSTRATION_SETTINGS, enabled: true }
			});
		});

		it('persists the static switch', () => {
			const state = new IllustrationState(
				storage,
				{ accumulatedMinutes: 0 },
				new FakeTimerSnapshot()
			);

			state.toggleMotion();

			expect(state.motionEnabled).toBe(false);
			expect(storage.saveSettingsCalls.at(-1)?.illustration?.motionEnabled).toBe(false);
		});

		it('persists the hide-while-focusing switch', () => {
			const state = new IllustrationState(
				storage,
				{ accumulatedMinutes: 0 },
				new FakeTimerSnapshot()
			);

			state.setHideWhileFocusing(true);

			expect(state.hideWhileFocusing).toBe(true);
			expect(storage.saveSettingsCalls.at(-1)?.illustration?.hideWhileFocusing).toBe(true);
		});

		it('persists a valid illustration selection', () => {
			const state = new IllustrationState(
				storage,
				{ accumulatedMinutes: 0 },
				new FakeTimerSnapshot()
			);

			state.setSelectedId('desert');

			expect(state.selectedId).toBe('desert');
			expect(storage.saveSettingsCalls.at(-1)?.illustration?.selectedId).toBe('desert');
		});

		it('ignores an unknown illustration selection', () => {
			const state = new IllustrationState(
				storage,
				{ accumulatedMinutes: 0 },
				new FakeTimerSnapshot()
			);

			state.setSelectedId('unknown');

			expect(state.selectedId).toBe('forest');
			expect(storage.saveSettingsCalls).toHaveLength(0);
		});
	});

	describe('integration with daily stats', () => {
		// The progress is derived from the focus history through the daily counter.
		function buildIntegrated() {
			const now = () => new Date(2026, 9, 3, 10, 0, 0);
			const emitter = new MockTimerEmitter();
			const history = createFocusHistoryState({
				repository: new LocalFocusHistoryRepository(new InMemoryStorage(), now),
				timer: emitter,
				tasks: { activeTask: null },
				nowProvider: now
			});
			const dailyStats = createDailyStatsState(history, now);
			const timer = new FakeTimerSnapshot();
			timer.startFocus();

			const state = new IllustrationState(
				new FakeSettingsStorage({
					illustration: { ...DEFAULT_ILLUSTRATION_SETTINGS, enabled: true }
				}),
				dailyStats,
				timer
			);

			return { state, dailyStats, emitter, history };
		}

		it('advances with completed focus blocks and ignores breaks', async () => {
			const { state, dailyStats, emitter, history } = buildIntegrated();
			expect(state.phase).toBe(0);

			emitter.emit(focusCompleted(25));
			emitter.emit(focusCompleted(25));
			emitter.emit(focusCompleted(25));
			await history.whenIdle();

			expect(dailyStats.accumulatedMinutes).toBe(75);
			expect(state.step).toBe(3);
			expect(state.phase).toBe(1);

			emitter.emit({
				type: 'block-completed',
				mode: 'shortBreak',
				round: 1,
				totalRoundsCompleted: 1,
				durationMs: 300_000,
				elapsedMs: 300_000,
				completedAt: new Date()
			});
			await history.whenIdle();

			expect(state.step).toBe(3);
			expect(state.phase).toBe(1);
			history.destroy();
		});

		it('does not advance with skipped or abandoned focus blocks', async () => {
			const { state, emitter, history } = buildIntegrated();

			emitter.emit({
				type: 'block-skipped',
				mode: 'focus',
				round: 1,
				totalRoundsCompleted: 0,
				durationMs: 1_500_000,
				elapsedMs: 600_000,
				skippedAt: new Date()
			});
			emitter.emit({
				type: 'block-abandoned',
				mode: 'focus',
				round: 1,
				totalRoundsCompleted: 0,
				durationMs: 1_500_000,
				elapsedMs: 600_000,
				abandonedAt: new Date()
			});
			await history.whenIdle();

			expect(history.entries).toHaveLength(2);
			expect(state.step).toBe(0);
			expect(state.phase).toBe(0);
			history.destroy();
		});

		it('goes back to the first phase when the history is cleared', async () => {
			const { state, emitter, history } = buildIntegrated();
			emitter.emit(focusCompleted(25));
			emitter.emit(focusCompleted(25));
			emitter.emit(focusCompleted(25));
			await history.whenIdle();
			expect(state.phase).toBe(1);

			await history.clear();

			expect(state.step).toBe(0);
			expect(state.phase).toBe(0);
			history.destroy();
		});
	});
});
