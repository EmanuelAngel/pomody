import type { ITimerTicker, TickCallback } from '$lib/domain/ports/timer-ticker.port';

/**
 * In-memory test fake implementing ITimerTicker.
 * Provides deterministic manual tick simulation and lifecycle call tracking.
 */
export class FakeTicker implements ITimerTicker {
	public isRunning = false;
	public tickCallback: TickCallback | null = null;
	public startCallCount = 0;
	public stopCallCount = 0;
	public destroyCallCount = 0;
	public lastIntervalMs?: number;

	/**
	 * Starts the ticker, registering the callback and updating observability metrics.
	 */
	start(onTick: TickCallback, intervalMs?: number): void {
		this.tickCallback = onTick;
		this.lastIntervalMs = intervalMs;
		this.isRunning = true;
		this.startCallCount++;
	}

	/**
	 * Stops ticking without destroying the callback or resources.
	 */
	stop(): void {
		this.isRunning = false;
		this.stopCallCount++;
	}

	/**
	 * Stops ticking and clears the registered tick callback.
	 */
	destroy(): void {
		this.isRunning = false;
		this.tickCallback = null;
		this.destroyCallCount++;
	}

	/**
	 * Manually triggers a tick with the specified deltaMs if tickCallback is defined.
	 * Defaults to 250ms.
	 */
	tick(deltaMs: number = 250): void {
		if (this.tickCallback) {
			this.tickCallback(deltaMs);
		}
	}

	/**
	 * Ergonomic alias for tick(deltaMs) to match test simulation ergonomics.
	 */
	simulateTick(deltaMs: number = 250): void {
		this.tick(deltaMs);
	}

	/**
	 * Advances time by triggering `tick(deltaMs)` multiple times sequentially.
	 */
	step(times: number = 1, deltaMs: number = 250): void {
		for (let i = 0; i < times; i++) {
			this.tick(deltaMs);
		}
	}

	/**
	 * Advances time by totalMs in chunks of stepIntervalMs (defaults to 250ms).
	 */
	advanceByMs(totalMs: number, stepIntervalMs: number = 250): void {
		if (totalMs <= 0) return;
		let remaining = totalMs;
		while (remaining > 0) {
			const chunk = Math.min(remaining, stepIntervalMs);
			this.tick(chunk);
			remaining -= chunk;
		}
	}

	/**
	 * Resets all internal call counters and state.
	 */
	reset(): void {
		this.isRunning = false;
		this.tickCallback = null;
		this.startCallCount = 0;
		this.stopCallCount = 0;
		this.destroyCallCount = 0;
		this.lastIntervalMs = undefined;
	}
}
