import type { TimerMode } from '../timer/timer-fsm';

export interface BlockCompletedEvent {
	readonly type: 'block-completed';
	readonly mode: TimerMode;
	readonly round: number;
	readonly totalRoundsCompleted: number;
	readonly completedAt: Date;
}

export interface BlockSkippedEvent {
	readonly type: 'block-skipped';
	readonly mode: TimerMode;
	readonly round: number;
	readonly totalRoundsCompleted: number;
	readonly skippedAt: Date;
}

export type DomainEvent = BlockCompletedEvent | BlockSkippedEvent;
