import { describe, it, expect } from 'vitest';
import type {
	IDistractionMonitor,
	OpenWindow,
	WindowObservation
} from './distraction-monitor.port';

/**
 * Minimal Web-shaped stub: the contract must be satisfiable by an adapter that
 * cannot read other processes, without throwing (spec §3.1).
 */
const unsupportedMonitor: IDistractionMonitor = {
	isSupported: false,
	getForegroundWindow(): Promise<WindowObservation | null> {
		return Promise.resolve(null);
	},
	listOpenWindows(): Promise<readonly OpenWindow[]> {
		return Promise.resolve([]);
	}
};

describe('IDistractionMonitor contract', () => {
	it('exposes an isSupported flag that an unsupported platform can report as false', () => {
		expect(unsupportedMonitor.isSupported).toBe(false);
	});

	it('resolves getForegroundWindow to null when the platform cannot observe windows', async () => {
		await expect(unsupportedMonitor.getForegroundWindow()).resolves.toBeNull();
	});

	it('resolves listOpenWindows to an empty list when the platform cannot observe windows', async () => {
		await expect(unsupportedMonitor.listOpenWindows()).resolves.toEqual([]);
	});

	it('carries exe, title and idleSeconds on a window observation', async () => {
		const observation: WindowObservation = {
			exe: 'chrome.exe',
			title: 'YouTube - Google Chrome',
			idleSeconds: 12
		};

		expect(Object.keys(observation).sort()).toEqual(['exe', 'idleSeconds', 'title']);
	});
});
