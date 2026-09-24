import {
	DEFAULT_TIMER_CONFIG,
	TimerFSM,
	type TimerConfig,
	type TimerMode,
	type TimerSnapshot,
	type TimerState as TimerFsmState,
	type Unsubscribe
} from '../domain/timer/timer-fsm';
import { WebWorkerTimerTicker } from '../adapters/worker/timer-worker';
import type { ITimerTicker } from '../domain/ports/timer-ticker.port';

/**
 * Formats a duration in milliseconds to MM:SS string representation.
 * Uses Math.ceil to prevent showing an off-by-one second at the start of a cycle.
 */
export function formatTime(remainingMs: number): string {
	const safeMs = Math.max(0, remainingMs);
	const totalSeconds = Math.ceil(safeMs / 1000);
	const minutes = Math.floor(totalSeconds / 60);
	const seconds = totalSeconds % 60;
	return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
}

/**
 * Reactive Composition Root connecting the pure domain TimerFSM with the WebWorker ticker.
 * Exposes fine-grained reactive state via Svelte 5 Runes ($state, $derived).
 */
export class TimerState {
	private readonly fsm: TimerFSM;
	private readonly ticker: ITimerTicker;
	private readonly unsubscribe: Unsubscribe;

	private _snapshot = $state<TimerSnapshot>({
		state: 'idle',
		mode: 'focus',
		remainingMs: 1500000,
		durationMs: 1500000,
		currentRound: 1,
		totalRoundsCompleted: 0,
		progress: 0
	});

	private _config = $state<TimerConfig>(DEFAULT_TIMER_CONFIG);

	public readonly formattedRemainingTime = $derived.by(() =>
		formatTime(this._snapshot.remainingMs)
	);
	public readonly formattedTime = $derived.by(() => this.formattedRemainingTime);

	public get snapshot(): TimerSnapshot {
		return this._snapshot;
	}

	public get state(): TimerFsmState {
		return this._snapshot.state;
	}

	public get mode(): TimerMode {
		return this._snapshot.mode;
	}

	public get remainingMs(): number {
		return this._snapshot.remainingMs;
	}

	public get durationMs(): number {
		return this._snapshot.durationMs;
	}

	public get currentRound(): number {
		return this._snapshot.currentRound;
	}

	public get totalRoundsCompleted(): number {
		return this._snapshot.totalRoundsCompleted;
	}

	public get progress(): number {
		return this._snapshot.progress;
	}

	public get isRunning(): boolean {
		return this._snapshot.state === 'running';
	}

	public get config(): TimerConfig {
		return this._config;
	}

	public get roundsBeforeLongBreak(): number {
		return this._config.roundsBeforeLongBreak;
	}

	constructor(config?: Partial<TimerConfig>, ticker?: ITimerTicker) {
		this.fsm = new TimerFSM(config);
		this.ticker = ticker ?? new WebWorkerTimerTicker();
		this._snapshot = this.fsm.snapshot;
		this._config = this.fsm.config;

		this.unsubscribe = this.fsm.subscribe((newSnapshot) => {
			this._snapshot = newSnapshot;
			this._config = this.fsm.config;
			if (newSnapshot.state !== 'running') {
				this.ticker.stop();
			}
		});
	}

	/**
	 * Starts or advances the timer.
	 */
	public start(): void {
		this.fsm.start();
		if (this.fsm.state === 'running' && !this.ticker.isRunning) {
			this.ticker.start((deltaMs) => {
				this.fsm.tick(deltaMs);
			});
		}
	}

	/**
	 * Pauses a running timer and halts ticker.
	 */
	public pause(): void {
		this.fsm.pause();
		this.ticker.stop();
	}

	/**
	 * Resumes a paused timer and restarts ticker.
	 */
	public resume(): void {
		this.fsm.resume();
		if (this.fsm.state === 'running' && !this.ticker.isRunning) {
			this.ticker.start((deltaMs) => {
				this.fsm.tick(deltaMs);
			});
		}
	}

	/**
	 * Skips the current cycle block and advances to the next mode in idle state.
	 */
	public skip(): void {
		this.ticker.stop();
		this.fsm.skip();
	}

	/**
	 * Updates the timer configuration and recalculates reactive snapshot.
	 */
	public updateConfig(config: Partial<TimerConfig>): void {
		this.fsm.updateConfig(config);
	}

	/**
	 * Resets remaining time for the current mode back to initial duration and enters idle state.
	 */
	public reset(): void {
		this.ticker.stop();
		this.fsm.reset();
	}

	/**
	 * Cleans up and destroys ticker resources (e.g. terminates Web Worker).
	 */
	public destroy(): void {
		this.unsubscribe();
		this.ticker.destroy();
	}
}

/**
 * Factory function to create isolated TimerState instances (useful for testing or sub-contexts).
 */
export function createTimerState(config?: Partial<TimerConfig>, ticker?: ITimerTicker): TimerState {
	return new TimerState(config, ticker);
}

/**
 * Global singleton reactive timer state instance for the application.
 */
export const timerState = new TimerState();
