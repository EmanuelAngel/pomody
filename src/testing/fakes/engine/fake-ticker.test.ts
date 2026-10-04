import { describe, it, expect, vi } from 'vitest';
import { FakeTicker } from '$tests/fakes/engine/fake-ticker';
import type { ITimerTicker } from '$lib/domain/ports/timer-ticker.port';

describe('FakeTicker', () => {
	it('initializes with default stopped state and zero call counters', () => {
		const ticker = new FakeTicker();

		expect(ticker.isRunning).toBe(false);
		expect(ticker.tickCallback).toBeNull();
		expect(ticker.startCallCount).toBe(0);
		expect(ticker.stopCallCount).toBe(0);
		expect(ticker.destroyCallCount).toBe(0);
		expect(ticker.lastIntervalMs).toBeUndefined();
	});

	it('registers callback, stores interval, and sets isRunning to true on start()', () => {
		const ticker = new FakeTicker();
		const onTick = vi.fn();

		ticker.start(onTick, 500);

		expect(ticker.isRunning).toBe(true);
		expect(ticker.tickCallback).toBe(onTick);
		expect(ticker.lastIntervalMs).toBe(500);
		expect(ticker.startCallCount).toBe(1);
	});

	it('tracks multiple start() invocations and updates tickCallback', () => {
		const ticker = new FakeTicker();
		const cb1 = vi.fn();
		const cb2 = vi.fn();

		ticker.start(cb1);
		expect(ticker.startCallCount).toBe(1);
		expect(ticker.tickCallback).toBe(cb1);
		expect(ticker.lastIntervalMs).toBeUndefined();

		ticker.start(cb2, 100);
		expect(ticker.startCallCount).toBe(2);
		expect(ticker.tickCallback).toBe(cb2);
		expect(ticker.lastIntervalMs).toBe(100);
	});

	it('sets isRunning to false and increments stopCallCount on stop()', () => {
		const ticker = new FakeTicker();
		const onTick = vi.fn();

		ticker.start(onTick);
		expect(ticker.isRunning).toBe(true);

		ticker.stop();
		expect(ticker.isRunning).toBe(false);
		expect(ticker.stopCallCount).toBe(1);
		// Stop does not wipe the callback
		expect(ticker.tickCallback).toBe(onTick);
	});

	it('sets isRunning to false, wipes tickCallback, and increments destroyCallCount on destroy()', () => {
		const ticker = new FakeTicker();
		const onTick = vi.fn();

		ticker.start(onTick);
		ticker.destroy();

		expect(ticker.isRunning).toBe(false);
		expect(ticker.tickCallback).toBeNull();
		expect(ticker.destroyCallCount).toBe(1);
	});

	it('triggers tickCallback with specified deltaMs on tick()', () => {
		const ticker = new FakeTicker();
		const onTick = vi.fn();

		ticker.start(onTick);
		ticker.tick(150);

		expect(onTick).toHaveBeenCalledTimes(1);
		expect(onTick).toHaveBeenCalledWith(150);
	});

	it('defaults deltaMs to 250ms on tick() when omitted', () => {
		const ticker = new FakeTicker();
		const onTick = vi.fn();

		ticker.start(onTick);
		ticker.tick();

		expect(onTick).toHaveBeenCalledTimes(1);
		expect(onTick).toHaveBeenCalledWith(250);
	});

	it('safely ignores tick() calls when tickCallback is not registered or null', () => {
		const ticker = new FakeTicker();

		expect(() => ticker.tick(500)).not.toThrow();
		expect(ticker.tickCallback).toBeNull();
	});

	it('steps multiple times with step()', () => {
		const ticker = new FakeTicker();
		const onTick = vi.fn();

		ticker.start(onTick);
		ticker.step(3, 100);

		expect(onTick).toHaveBeenCalledTimes(3);
		expect(onTick).toHaveBeenNthCalledWith(1, 100);
		expect(onTick).toHaveBeenNthCalledWith(2, 100);
		expect(onTick).toHaveBeenNthCalledWith(3, 100);
	});

	it('uses default step values (1 time, 250ms) when arguments are omitted', () => {
		const ticker = new FakeTicker();
		const onTick = vi.fn();

		ticker.start(onTick);
		ticker.step();

		expect(onTick).toHaveBeenCalledTimes(1);
		expect(onTick).toHaveBeenCalledWith(250);
	});

	it('advances time in increments using advanceByMs()', () => {
		const ticker = new FakeTicker();
		const deltas: number[] = [];
		ticker.start((delta) => deltas.push(delta));

		ticker.advanceByMs(1000, 250);

		expect(deltas).toEqual([250, 250, 250, 250]);
	});

	it('handles non-divisible remainders correctly in advanceByMs()', () => {
		const ticker = new FakeTicker();
		const deltas: number[] = [];
		ticker.start((delta) => deltas.push(delta));

		ticker.advanceByMs(600, 250);

		expect(deltas).toEqual([250, 250, 100]);
	});

	it('ignores non-positive values in advanceByMs()', () => {
		const ticker = new FakeTicker();
		const onTick = vi.fn();
		ticker.start(onTick);

		ticker.advanceByMs(0);
		ticker.advanceByMs(-500);

		expect(onTick).not.toHaveBeenCalled();
	});

	it('resets all internal state and counters on reset()', () => {
		const ticker = new FakeTicker();
		const onTick = vi.fn();

		ticker.start(onTick, 500);
		ticker.stop();
		ticker.destroy();

		expect(ticker.startCallCount).toBe(1);
		expect(ticker.stopCallCount).toBe(1);
		expect(ticker.destroyCallCount).toBe(1);
		expect(ticker.lastIntervalMs).toBe(500);

		ticker.reset();

		expect(ticker.isRunning).toBe(false);
		expect(ticker.tickCallback).toBeNull();
		expect(ticker.startCallCount).toBe(0);
		expect(ticker.stopCallCount).toBe(0);
		expect(ticker.destroyCallCount).toBe(0);
		expect(ticker.lastIntervalMs).toBeUndefined();
	});

	it('conforms strictly to ITimerTicker interface', () => {
		const ticker: ITimerTicker = new FakeTicker();
		expect(ticker.isRunning).toBe(false);
		ticker.start(() => {});
		expect(ticker.isRunning).toBe(true);
		ticker.stop();
		expect(ticker.isRunning).toBe(false);
		ticker.destroy();
		expect(ticker.isRunning).toBe(false);
	});
});
