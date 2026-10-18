import { describe, it, expect } from 'vitest';
import type { DistractionNotice, IDistractionNotifier } from './distraction-notifier.port';

/**
 * Minimal Web-shaped stub: the contract must be satisfiable by an adapter that cannot
 * show OS notifications, without throwing (spec §5).
 */
const unsupportedNotifier: IDistractionNotifier = {
	isSupported: false,
	requestPermission(): Promise<boolean> {
		return Promise.resolve(false);
	},
	notify(): Promise<void> {
		return Promise.resolve();
	}
};

describe('IDistractionNotifier contract', () => {
	it('exposes an isSupported flag that an unsupported platform can report as false', () => {
		expect(unsupportedNotifier.isSupported).toBe(false);
	});

	it('resolves requestPermission to false when the platform cannot ask for it', async () => {
		await expect(unsupportedNotifier.requestPermission()).resolves.toBe(false);
	});

	it('resolves notify without throwing when the platform cannot show notices', async () => {
		const notice: DistractionNotice = { title: 'Declared window', body: 'You went back to A.' };

		await expect(unsupportedNotifier.notify(notice)).resolves.toBeUndefined();
	});

	it('carries exactly a title and a body: the port never sees a rule, a policy or a locale', () => {
		const notice: DistractionNotice = { title: 'Declared window', body: 'You went back to A.' };

		expect(Object.keys(notice).sort()).toEqual(['body', 'title']);
	});
});
