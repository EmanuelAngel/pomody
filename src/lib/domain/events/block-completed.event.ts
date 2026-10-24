import type { TimerMode } from '../timer/timer-fsm';

export interface BlockCompletedEvent {
	readonly type: 'block-completed';
	readonly mode: TimerMode;
	readonly round: number;
	readonly totalRoundsCompleted: number;
	readonly durationMs: number;
	/** Time the block actually ran, excluding pauses. Equals `durationMs` on completion. */
	readonly elapsedMs: number;
	readonly completedAt: Date;
}

export interface BlockSkippedEvent {
	readonly type: 'block-skipped';
	readonly mode: TimerMode;
	readonly round: number;
	readonly totalRoundsCompleted: number;
	/** Planned duration of the skipped block. */
	readonly durationMs: number;
	/** Time the block actually ran, excluding pauses. `0` is a cold skip. */
	readonly elapsedMs: number;
	readonly skippedAt: Date;
}

/** A block in progress (running or paused) thrown away by a reset. */
export interface BlockAbandonedEvent {
	readonly type: 'block-abandoned';
	readonly mode: TimerMode;
	readonly round: number;
	readonly totalRoundsCompleted: number;
	readonly durationMs: number;
	/** Time the block actually ran before being abandoned, excluding pauses. */
	readonly elapsedMs: number;
	readonly abandonedAt: Date;
}

export type DomainEvent = BlockCompletedEvent | BlockSkippedEvent | BlockAbandonedEvent;
