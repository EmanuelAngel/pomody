import type { TimerMode } from '../timer/timer-fsm';

/** Cycles shorter than this still grow on a 4-round scale, so they never reach full maturity. */
export const MIN_GROWTH_CYCLE_ROUNDS = 4;

export interface CycleGrowthInput {
	readonly mode: TimerMode;
	readonly currentRound: number;
	readonly progress: number;
	readonly roundsBeforeLongBreak: number;
}

function clamp01(value: number): number {
	if (!Number.isFinite(value)) return 0;
	return Math.min(1, Math.max(0, value));
}

/**
 * Position inside the Pomodoro cycle as a 0..1 growth value.
 * Grows continuously during focus blocks, holds during breaks, and reaches 1
 * exactly at the long break. A new cycle (focus of round 1) starts back at 0.
 */
export function getCycleGrowth(input: CycleGrowthInput): number {
	const scale = Math.max(MIN_GROWTH_CYCLE_ROUNDS, input.roundsBeforeLongBreak);
	const completedRounds = Math.max(0, input.currentRound - 1);
	const roundProgress = input.mode === 'focus' ? clamp01(input.progress) : 1;
	return clamp01((completedRounds + roundProgress) / scale);
}

/** A cycle restarts when growth falls from full maturity back to the very beginning. */
export function isHarvest(previousGrowth: number, nextGrowth: number): boolean {
	return previousGrowth >= 1 && nextGrowth <= 0;
}
