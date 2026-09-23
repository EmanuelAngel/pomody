import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { FallbackTimerTicker, WebWorkerTimerTicker } from './timer-worker';

describe('FallbackTimerTicker', () => {
	beforeEach(() => {
		vi.useFakeTimers();
	});

	afterEach(() => {
		vi.useRealTimers();
	});

	it('should initialize with isRunning set to false', () => {
		const ticker = new FallbackTimerTicker();
		expect(ticker.isRunning).toBe(false);
	});

	it('should start ticking and emit deltaMs calculated from Date.now()', () => {
		const ticker = new FallbackTimerTicker();
		const onTick = vi.fn();

		ticker.start(onTick, 200);
		expect(ticker.isRunning).toBe(true);

		// Advance time by 200ms
		vi.advanceTimersByTime(200);
		expect(onTick).toHaveBeenCalledTimes(1);
		expect(onTick).toHaveBeenCalledWith(200);

		// Advance time by another 200ms
		vi.advanceTimersByTime(200);
		expect(onTick).toHaveBeenCalledTimes(2);
		expect(onTick).toHaveBeenLastCalledWith(200);
	});

	it('should stop ticking when stop() is called', () => {
		const ticker = new FallbackTimerTicker();
		const onTick = vi.fn();

		ticker.start(onTick, 250);
		vi.advanceTimersByTime(250);
		expect(onTick).toHaveBeenCalledTimes(1);

		ticker.stop();
		expect(ticker.isRunning).toBe(false);

		vi.advanceTimersByTime(500);
		expect(onTick).toHaveBeenCalledTimes(1);
	});

	it('should restart cleanly when start() is called multiple times without explicit stop', () => {
		const ticker = new FallbackTimerTicker();
		const onTick1 = vi.fn();
		const onTick2 = vi.fn();

		ticker.start(onTick1, 200);
		vi.advanceTimersByTime(200);
		expect(onTick1).toHaveBeenCalledTimes(1);

		ticker.start(onTick2, 300);
		vi.advanceTimersByTime(300);
		expect(onTick1).toHaveBeenCalledTimes(1);
		expect(onTick2).toHaveBeenCalledTimes(1);
	});

	it('should clean up on destroy()', () => {
		const ticker = new FallbackTimerTicker();
		const onTick = vi.fn();

		ticker.start(onTick, 100);
		ticker.destroy();
		expect(ticker.isRunning).toBe(false);

		vi.advanceTimersByTime(500);
		expect(onTick).not.toHaveBeenCalled();
	});
});

describe('WebWorkerTimerTicker', () => {
	beforeEach(() => {
		vi.useFakeTimers();
	});

	afterEach(() => {
		vi.restoreAllMocks();
		vi.useRealTimers();
	});

	it('should use fallback ticker transparently when Worker is undefined in Node/Vitest', () => {
		const originalWorker = globalThis.Worker;
		// @ts-expect-error intentionally removing Worker for test
		delete globalThis.Worker;

		try {
			const ticker = new WebWorkerTimerTicker();
			const onTick = vi.fn();

			ticker.start(onTick, 250);
			expect(ticker.isRunning).toBe(true);

			vi.advanceTimersByTime(250);
			expect(onTick).toHaveBeenCalledTimes(1);
			expect(onTick).toHaveBeenCalledWith(250);

			ticker.stop();
			expect(ticker.isRunning).toBe(false);

			ticker.destroy();
		} finally {
			globalThis.Worker = originalWorker;
		}
	});

	it('should instantiate and communicate with native Worker when available', () => {
		const workerBridge: {
			messageHandler: ((event: MessageEvent) => void) | null;
		} = { messageHandler: null };
		const mockPostMessage = vi.fn();
		const mockTerminate = vi.fn();

		class MockWorker {
			public postMessage = mockPostMessage;
			public terminate = mockTerminate;
			public onerror: ((error: unknown) => void) | null = null;

			set onmessage(handler: (event: MessageEvent) => void) {
				workerBridge.messageHandler = handler;
			}
		}

		// @ts-expect-error mock worker class
		globalThis.Worker = MockWorker;

		const ticker = new WebWorkerTimerTicker();
		const onTick = vi.fn();

		ticker.start(onTick, 300);
		expect(ticker.isRunning).toBe(true);
		expect(mockPostMessage).toHaveBeenCalledWith({ action: 'start', intervalMs: 300 });

		// Simulate tick from worker
		workerBridge.messageHandler?.({
			data: { type: 'tick', deltaMs: 300 }
		} as MessageEvent);

		expect(onTick).toHaveBeenCalledWith(300);

		// Stop
		ticker.stop();
		expect(ticker.isRunning).toBe(false);
		expect(mockPostMessage).toHaveBeenCalledWith({ action: 'stop' });

		// Destroy
		ticker.destroy();
		expect(mockTerminate).toHaveBeenCalled();
	});

	it('should fallback seamlessly when Worker constructor throws an error', () => {
		class ThrowingWorker {
			constructor() {
				throw new Error('SecurityError: Worker is disabled');
			}
		}

		// @ts-expect-error mock throwing worker
		globalThis.Worker = ThrowingWorker;

		const ticker = new WebWorkerTimerTicker();
		const onTick = vi.fn();

		ticker.start(onTick, 250);
		expect(ticker.isRunning).toBe(true);

		vi.advanceTimersByTime(250);
		expect(onTick).toHaveBeenCalledTimes(1);
		expect(onTick).toHaveBeenCalledWith(250);

		ticker.destroy();
	});

	it('should switch to fallback when Worker triggers an onerror event', () => {
		const workerBridge: {
			errorHandler: ((err: unknown) => void) | null;
		} = { errorHandler: null };

		class FaultyWorker {
			public postMessage = vi.fn();
			public terminate = vi.fn();
			set onerror(handler: (err: unknown) => void) {
				workerBridge.errorHandler = handler;
			}
		}

		// @ts-expect-error mock faulty worker
		globalThis.Worker = FaultyWorker;

		const ticker = new WebWorkerTimerTicker();
		const onTick = vi.fn();

		ticker.start(onTick, 250);
		expect(ticker.isRunning).toBe(true);

		// Trigger worker error
		workerBridge.errorHandler?.(new Error('Worker script error'));

		vi.advanceTimersByTime(250);
		expect(onTick).toHaveBeenCalledWith(250);

		ticker.destroy();
	});

	it('should delegate ticks to the latest callback on consecutive start() calls (JD-01)', () => {
		const workerBridge: {
			messageHandler: ((event: MessageEvent) => void) | null;
		} = { messageHandler: null };
		const mockPostMessage = vi.fn();
		const mockTerminate = vi.fn();

		class MockWorker {
			public postMessage = mockPostMessage;
			public terminate = mockTerminate;
			public onerror: ((error: unknown) => void) | null = null;

			set onmessage(handler: (event: MessageEvent) => void) {
				workerBridge.messageHandler = handler;
			}
		}

		// @ts-expect-error mock worker class
		globalThis.Worker = MockWorker;

		const ticker = new WebWorkerTimerTicker();
		const onTick1 = vi.fn();
		const onTick2 = vi.fn();

		ticker.start(onTick1, 200);
		ticker.start(onTick2, 300);

		// Simulate tick from worker
		workerBridge.messageHandler?.({
			data: { type: 'tick', deltaMs: 300 }
		} as MessageEvent);

		expect(onTick1).not.toHaveBeenCalled();
		expect(onTick2).toHaveBeenCalledWith(300);

		ticker.destroy();
	});

	it('should ignore in-flight worker ticks arriving after stop() (JD-02)', () => {
		const workerBridge: {
			messageHandler: ((event: MessageEvent) => void) | null;
		} = { messageHandler: null };
		const mockPostMessage = vi.fn();
		const mockTerminate = vi.fn();

		class MockWorker {
			public postMessage = mockPostMessage;
			public terminate = mockTerminate;
			public onerror: ((error: unknown) => void) | null = null;

			set onmessage(handler: (event: MessageEvent) => void) {
				workerBridge.messageHandler = handler;
			}
		}

		// @ts-expect-error mock worker class
		globalThis.Worker = MockWorker;

		const ticker = new WebWorkerTimerTicker();
		const onTick = vi.fn();

		ticker.start(onTick, 250);
		ticker.stop();

		// Simulate in-flight tick arriving after stop()
		workerBridge.messageHandler?.({
			data: { type: 'tick', deltaMs: 250 }
		} as MessageEvent);

		expect(onTick).not.toHaveBeenCalled();

		ticker.destroy();
	});

	it('should not start fallback ticker when worker onerror fires after stop() (JD-05)', () => {
		const workerBridge: {
			errorHandler: ((err: unknown) => void) | null;
		} = { errorHandler: null };

		class FaultyWorker {
			public postMessage = vi.fn();
			public terminate = vi.fn();
			set onerror(handler: (err: unknown) => void) {
				workerBridge.errorHandler = handler;
			}
		}

		// @ts-expect-error mock faulty worker
		globalThis.Worker = FaultyWorker;

		const ticker = new WebWorkerTimerTicker();
		const onTick = vi.fn();

		ticker.start(onTick, 250);
		ticker.stop();

		// Trigger error after ticker has been stopped
		workerBridge.errorHandler?.(new Error('Async worker error after stop'));

		vi.advanceTimersByTime(500);
		expect(onTick).not.toHaveBeenCalled();
		expect(ticker.isRunning).toBe(false);

		ticker.destroy();
	});
});
