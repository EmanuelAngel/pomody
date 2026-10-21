import { describe, it, expect } from 'vitest';
import type { BlockNotice, IBlockNotifier } from './block-notifier.port';

/**
 * Minimal Web-shaped stub: the contract must be satisfiable by an adapter that cannot
 * show OS notifications, without throwing (spec S3).
 */
const unsupportedNotifier: IBlockNotifier = {
	isSupported: false,
	requestPermission(): Promise<boolean> {
		return Promise.resolve(false);
	},
	notify(): Promise<void> {
		return Promise.resolve();
	}
};

describe('IBlockNotifier contract', () => {
	it('exposes an isSupported flag that an unsupported platform can report as false', () => {
		expect(unsupportedNotifier.isSupported).toBe(false);
	});

	it('resolves requestPermission to false when the platform cannot ask for it', async () => {
		await expect(unsupportedNotifier.requestPermission()).resolves.toBe(false);
	});

	it('resolves notify without throwing when the platform cannot show notices', async () => {
		const notice: BlockNotice = {
			title: 'Focus block completed',
			body: 'Take a short break.'
		};

		await expect(unsupportedNotifier.notify(notice)).resolves.toBeUndefined();
	});

	it('carries a finished title and a body naming the next phase, and nothing else', () => {
		const notice: BlockNotice = {
			title: 'Focus block completed',
			body: 'Take a short break.'
		};

		expect(Object.keys(notice).sort()).toEqual(['body', 'title']);
	});
});
