import type { TimerMode } from '../timer/timer-fsm';

export interface BlockCompletedEvent {
	readonly type: 'block-completed';
	readonly mode: TimerMode;
	readonly round: number;
	readonly totalRoundsCompleted: number;
	readonly completedAt: Date;
}

export type DomainEvent = BlockCompletedEvent;
