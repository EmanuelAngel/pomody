import type { TimerConfig, TimerMode } from '../timer/timer-fsm';

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

/** A block entering `running`: the first start, or the start after a completed block. */
export interface BlockStartedEvent {
	readonly type: 'block-started';
	readonly mode: TimerMode;
	readonly round: number;
	readonly durationMs: number;
}

export interface BlockPausedEvent {
	readonly type: 'block-paused';
	readonly mode: TimerMode;
	readonly round: number;
	readonly remainingMs: number;
}

export interface BlockResumedEvent {
	readonly type: 'block-resumed';
	readonly mode: TimerMode;
	readonly round: number;
	readonly remainingMs: number;
}

/** Emitted only when an update actually changes the configuration. */
export interface ConfigChangedEvent {
	readonly type: 'config-changed';
	readonly config: TimerConfig;
}

/** The events that close a block; every one of them carries its planned and elapsed time. */
export type BlockEndedEvent = BlockCompletedEvent | BlockSkippedEvent | BlockAbandonedEvent;

export type DomainEvent =
	BlockEndedEvent | BlockStartedEvent | BlockPausedEvent | BlockResumedEvent | ConfigChangedEvent;

export function isBlockEndedEvent(event: DomainEvent): event is BlockEndedEvent {
	return (
		event.type === 'block-completed' ||
		event.type === 'block-skipped' ||
		event.type === 'block-abandoned'
	);
}
