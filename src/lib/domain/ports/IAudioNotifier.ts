import type { TimerMode } from '../timer/timer-fsm';

export interface IAudioNotifier {
	/**
	 * Synthesizes and plays a transition chime appropriate for the completed timer mode.
	 * @param mode The completed timer mode ('focus', 'shortBreak', or 'longBreak').
	 */
	notifyBlockCompleted(mode: TimerMode): Promise<void> | void;

	/**
	 * Synthesizes and plays a crisp double attention chime when a distraction is detected.
	 */
	notifyDistraction(): Promise<void> | void;

	/**
	 * Resumes or unlocks the underlying AudioContext in response to a user interaction gesture.
	 */
	unlock(): Promise<void> | void;
}
