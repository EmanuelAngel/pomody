import { describe, it, expect } from 'vitest';
import { NoopDistractionMonitor } from './noop-distraction-monitor';

describe('NoopDistractionMonitor', () => {
	const monitor = new NoopDistractionMonitor();

	it('should report the platform as unsupported', () => {
		expect(monitor.isSupported).toBe(false);
	});

	it('should answer null for the foreground window without throwing', async () => {
		await expect(monitor.getForegroundWindow()).resolves.toBeNull();
	});

	it('should answer an empty window list without throwing', async () => {
		await expect(monitor.listOpenWindows()).resolves.toEqual([]);
	});
});
