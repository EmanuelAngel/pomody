import type { DomainEvent, BlockCompletedEvent } from '../events/block-completed.event';

export type { DomainEvent, BlockCompletedEvent };
export type TimerState = 'idle' | 'running' | 'paused' | 'completed';
export type TimerMode = 'focus' | 'shortBreak' | 'longBreak';

export interface TimerConfig {
	readonly focusDurationSeconds: number;
	readonly shortBreakDurationSeconds: number;
	readonly longBreakDurationSeconds: number;
	readonly roundsBeforeLongBreak: number;
}

export interface TimerSnapshot {
	readonly state: TimerState;
	readonly mode: TimerMode;
	readonly remainingMs: number;
	readonly durationMs: number;
	readonly currentRound: number;
	readonly totalRoundsCompleted: number;
	readonly progress: number;
}

export type TimerSubscriber = (snapshot: TimerSnapshot) => void;
export type Unsubscribe = () => void;

export class InvalidTimerConfigError extends Error {
	constructor(message: string) {
		super(message);
		this.name = 'InvalidTimerConfigError';
	}
}

export const DEFAULT_TIMER_CONFIG: TimerConfig = Object.freeze({
	focusDurationSeconds: 1500,
	shortBreakDurationSeconds: 300,
	longBreakDurationSeconds: 900,
	roundsBeforeLongBreak: 4
});

/**
 * Asserts that configuration values are valid.
 * Duration fields must be strictly positive integers.
 * roundsBeforeLongBreak must be an integer between 1 and 12 inclusive.
 * Throws InvalidTimerConfigError if any property fails validation.
 */
export function validateTimerConfig(config: TimerConfig): void {
	const durationFields: (keyof Omit<TimerConfig, 'roundsBeforeLongBreak'>)[] = [
		'focusDurationSeconds',
		'shortBreakDurationSeconds',
		'longBreakDurationSeconds'
	];

	for (const field of durationFields) {
		const value = config[field];
		if (
			typeof value !== 'number' ||
			!Number.isFinite(value) ||
			!Number.isInteger(value) ||
			value <= 0
		) {
			throw new InvalidTimerConfigError(
				`Invalid configuration for "${field}": expected a positive integer, got ${value}`
			);
		}
	}

	const rounds = config.roundsBeforeLongBreak;
	if (
		typeof rounds !== 'number' ||
		!Number.isFinite(rounds) ||
		!Number.isInteger(rounds) ||
		rounds < 1 ||
		rounds > 12
	) {
		throw new InvalidTimerConfigError(
			`Invalid configuration for "roundsBeforeLongBreak": expected an integer between 1 and 12, got ${config.roundsBeforeLongBreak}`
		);
	}
}

/**
 * Calculates the next Pomodoro mode and round given the current mode, round, and cycle limits.
 */
export function calculateNextCycleStep(
	currentMode: TimerMode,
	currentRound: number,
	roundsBeforeLongBreak: number
): { nextMode: TimerMode; nextRound: number } {
	switch (currentMode) {
		case 'focus': {
			const nextMode = currentRound < roundsBeforeLongBreak ? 'shortBreak' : 'longBreak';
			return { nextMode, nextRound: currentRound };
		}
		case 'shortBreak': {
			return { nextMode: 'focus', nextRound: currentRound + 1 };
		}
		case 'longBreak': {
			return { nextMode: 'focus', nextRound: 1 };
		}
	}
}

export class TimerFSM {
	private _config: TimerConfig;
	private _state: TimerState = 'idle';
	private _mode: TimerMode = 'focus';
	private _currentRound = 1;
	private _totalRoundsCompleted = 0;
	private _durationMs: number;
	private _remainingMs: number;
	private readonly _subscribers: Set<TimerSubscriber> = new Set();
	private readonly _eventSubscribers: Set<(event: DomainEvent) => void> = new Set();

	constructor(config?: Partial<TimerConfig>) {
		const merged: TimerConfig = {
			...DEFAULT_TIMER_CONFIG,
			...config
		};
		validateTimerConfig(merged);
		this._config = Object.freeze(merged);
		this._durationMs = this.getModeDurationMs(this._mode);
		this._remainingMs = this._durationMs;
	}

	private getModeDurationMs(mode: TimerMode): number {
		switch (mode) {
			case 'focus':
				return this._config.focusDurationSeconds * 1000;
			case 'shortBreak':
				return this._config.shortBreakDurationSeconds * 1000;
			case 'longBreak':
				return this._config.longBreakDurationSeconds * 1000;
		}
	}

	public get config(): TimerConfig {
		return this._config;
	}

	/**
	 * Updates the timer configuration with partial overrides.
	 * Merges with the existing configuration and validates the result.
	 * If the timer is idle, resets remainingMs and durationMs to match the new duration for the active mode.
	 * If running or paused, the active block's baseline duration is anchored and finishes uninterrupted with its current remainingMs.
	 * Synchronously notifies subscribers of the updated snapshot.
	 */
	public updateConfig(config: Partial<TimerConfig>): void {
		const merged: TimerConfig = {
			...this._config,
			...config
		};
		validateTimerConfig(merged);
		this._config = Object.freeze(merged);

		if (this._state === 'idle') {
			this._durationMs = this.getModeDurationMs(this._mode);
			this._remainingMs = this._durationMs;
		}

		this.notify();
	}

	public get state(): TimerState {
		return this._state;
	}

	public get mode(): TimerMode {
		return this._mode;
	}

	public get durationMs(): number {
		return this._durationMs;
	}

	public get remainingMs(): number {
		return this._remainingMs;
	}

	public get currentRound(): number {
		return this._currentRound;
	}

	public get totalRoundsCompleted(): number {
		return this._totalRoundsCompleted;
	}

	public get progress(): number {
		const duration = this.durationMs;
		if (duration <= 0) return 0;
		const rawProgress = (duration - this._remainingMs) / duration;
		return Math.min(1.0, Math.max(0.0, rawProgress));
	}

	public get snapshot(): TimerSnapshot {
		return Object.freeze({
			state: this._state,
			mode: this._mode,
			remainingMs: this._remainingMs,
			durationMs: this.durationMs,
			currentRound: this._currentRound,
			totalRoundsCompleted: this._totalRoundsCompleted,
			progress: this.progress
		});
	}

	public subscribe(subscriber: TimerSubscriber): Unsubscribe {
		this._subscribers.add(subscriber);
		return () => {
			this._subscribers.delete(subscriber);
		};
	}

	public onEvent(subscriber: (event: DomainEvent) => void): Unsubscribe {
		this._eventSubscribers.add(subscriber);
		return () => {
			this._eventSubscribers.delete(subscriber);
		};
	}

	public start(): void {
		if (this._state === 'idle') {
			this._state = 'running';
			this.notify();
			return;
		}

		if (this._state === 'completed') {
			this.advanceMode();
			this._state = 'running';
			this.notify();
			return;
		}

		// 'running' or 'paused' are safe no-ops
	}

	public pause(): void {
		if (this._state === 'running') {
			this._state = 'paused';
			this.notify();
		}
		// 'idle', 'paused', 'completed' are safe no-ops
	}

	public resume(): void {
		if (this._state === 'paused') {
			this._state = 'running';
			this.notify();
		}
		// 'idle', 'running', 'completed' are safe no-ops
	}

	public reset(): void {
		if (this._state === 'idle') {
			this._durationMs = this.getModeDurationMs(this._mode);
			this._remainingMs = this._durationMs;
			return;
		}

		this._state = 'idle';
		this._durationMs = this.getModeDurationMs(this._mode);
		this._remainingMs = this._durationMs;
		this.notify();
	}

	public skip(): void {
		this.advanceMode();
		this._state = 'idle';
		this.notify();
	}

	public tick(deltaMs: number): void {
		if (this._state !== 'running') {
			return;
		}

		if (typeof deltaMs !== 'number' || !Number.isFinite(deltaMs) || deltaMs <= 0) {
			return;
		}

		if (deltaMs >= this._remainingMs) {
			this._remainingMs = 0;
			this._state = 'completed';
			if (this._mode === 'focus') {
				this._totalRoundsCompleted += 1;
			}
			this.emitEvent({
				type: 'block-completed',
				mode: this._mode,
				round: this._currentRound,
				totalRoundsCompleted: this._totalRoundsCompleted,
				completedAt: new Date()
			});
			this.notify();
			return;
		}

		this._remainingMs -= deltaMs;
		this.notify();
	}

	private advanceMode(): void {
		const step = calculateNextCycleStep(
			this._mode,
			this._currentRound,
			this._config.roundsBeforeLongBreak
		);
		this._mode = step.nextMode;
		this._currentRound = step.nextRound;
		this._durationMs = this.getModeDurationMs(this._mode);
		this._remainingMs = this._durationMs;
	}

	private emitEvent(event: DomainEvent): void {
		if (this._eventSubscribers.size === 0) return;
		for (const subscriber of this._eventSubscribers) {
			try {
				subscriber(event);
			} catch (error) {
				// preserve listener isolation
				console.error(error);
			}
		}
	}

	private notify(): void {
		if (this._subscribers.size === 0) return;
		const snap = this.snapshot;
		for (const subscriber of this._subscribers) {
			try {
				subscriber(snap);
			} catch (error) {
				// preserve listener isolation
				console.error(error);
			}
		}
	}
}
