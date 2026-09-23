import type { ITimerTicker, TickCallback } from '../../domain/ports/timer-ticker.port';

/**
 * Transparent fallback ticker using main-thread setInterval with Date.now() delta tracking.
 * Used when running in environments without native Web Worker support (e.g. Node / Vitest)
 * or when Web Worker instantiation is blocked by security policies.
 */
export class FallbackTimerTicker implements ITimerTicker {
	private intervalId: ReturnType<typeof setInterval> | null = null;
	private lastTimestamp = 0;
	private _isRunning = false;

	public get isRunning(): boolean {
		return this._isRunning;
	}

	public start(onTick: TickCallback, intervalMs = 250): void {
		this.stop();
		this._isRunning = true;
		this.lastTimestamp = Date.now();

		const safeInterval = intervalMs > 0 ? intervalMs : 250;
		this.intervalId = setInterval(() => {
			const now = Date.now();
			const deltaMs = now - this.lastTimestamp;
			this.lastTimestamp = now;
			onTick(deltaMs);
		}, safeInterval);
	}

	public stop(): void {
		this._isRunning = false;
		if (this.intervalId !== null) {
			clearInterval(this.intervalId);
			this.intervalId = null;
		}
	}

	public destroy(): void {
		this.stop();
	}
}

/**
 * Web Worker timer ticker adapter implementing ITimerTicker.
 * Offloads intervals to a background thread to prevent browser and WebView2 throttling.
 * Falls back transparently to FallbackTimerTicker if Web Workers are unavailable or fail.
 */
export class WebWorkerTimerTicker implements ITimerTicker {
	private worker: Worker | null = null;
	private fallback: FallbackTimerTicker | null = null;
	private _isRunning = false;

	public get isRunning(): boolean {
		return this._isRunning;
	}

	public start(onTick: TickCallback, intervalMs = 250): void {
		this.stop();
		this._isRunning = true;

		// Transparent fallback for environments without Web Worker support (Node, Vitest)
		if (typeof Worker === 'undefined') {
			this.ensureFallback().start(onTick, intervalMs);
			return;
		}

		try {
			if (!this.worker) {
				this.worker = new Worker(new URL('./timer.worker.ts', import.meta.url), {
					type: 'module'
				});

				this.worker.onmessage = (event: MessageEvent<{ type?: string; deltaMs?: number }>) => {
					if (event.data?.type === 'tick' && typeof event.data.deltaMs === 'number') {
						onTick(event.data.deltaMs);
					}
				};

				this.worker.onerror = () => {
					// In case of worker runtime failure, switch gracefully to fallback
					this.terminateWorker();
					this.ensureFallback().start(onTick, intervalMs);
				};
			}

			this.worker.postMessage({ action: 'start', intervalMs });
		} catch {
			// If instantiation fails (e.g., security restrictions or unsupported URL scheme)
			this.terminateWorker();
			this.ensureFallback().start(onTick, intervalMs);
		}
	}

	public stop(): void {
		this._isRunning = false;
		if (this.fallback) {
			this.fallback.stop();
		}
		if (this.worker) {
			this.worker.postMessage({ action: 'stop' });
		}
	}

	public destroy(): void {
		this.stop();
		this.terminateWorker();
		if (this.fallback) {
			this.fallback.destroy();
			this.fallback = null;
		}
	}

	private ensureFallback(): FallbackTimerTicker {
		if (!this.fallback) {
			this.fallback = new FallbackTimerTicker();
		}
		return this.fallback;
	}

	private terminateWorker(): void {
		if (this.worker) {
			this.worker.terminate();
			this.worker = null;
		}
	}
}
