export type TimerState = 'idle' | 'running' | 'paused' | 'completed';
export type TimerMode = 'focus' | 'shortBreak' | 'longBreak';

export interface TimerConfig {
	focusDurationSeconds: number;
	shortBreakDurationSeconds: number;
	longBreakDurationSeconds: number;
}

export const DEFAULT_TIMER_CONFIG: TimerConfig = {
	focusDurationSeconds: 25 * 60,
	shortBreakDurationSeconds: 5 * 60,
	longBreakDurationSeconds: 15 * 60
};
