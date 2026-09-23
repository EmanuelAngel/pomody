export type TickCallback = (deltaMs: number) => void;

export interface ITimerTicker {
	/**
	 * Starts emitting tick events with the elapsed deltaMs.
	 * @param onTick Callback invoked on each tick with elapsed time in milliseconds.
	 * @param intervalMs Desired tick interval in milliseconds (defaults to 250ms).
	 */
	start(onTick: TickCallback, intervalMs?: number): void;

	/**
	 * Stops emitting ticks without destroying the underlying resources.
	 */
	stop(): void;

	/**
	 * Stops ticking and cleans up background resources (e.g. terminates worker).
	 */
	destroy(): void;

	/**
	 * Whether the ticker is currently running.
	 */
	readonly isRunning: boolean;
}
